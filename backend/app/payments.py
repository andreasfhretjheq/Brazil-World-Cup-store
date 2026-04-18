"""Integração Pix via Asaas.

Os endpoints e o host (sandbox vs produção) são decididos pela própria
chave de API: se contém `hmlg`, usamos o sandbox; caso contrário, produção.
"""
from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from typing import Optional, TypedDict

import httpx

log = logging.getLogger(__name__)


class PixPayment(TypedDict):
    id: str
    status: str
    qr_code: str
    qr_code_base64: str
    ticket_url: Optional[str]


# CPF de teste aceito no sandbox do Asaas. Serve só pra criar o "customer"
# quando não temos o CPF real do pagador (caso típico de e-commerce com
# cadastro leve por e-mail). Em produção, o ideal é coletar o CPF.
_CPF_TESTE_SANDBOX = "24971563792"


def _base_url() -> str:
    chave = os.getenv("ASAAS_API_KEY", "")
    if "hmlg" in chave.lower() or os.getenv("ASAAS_SANDBOX") == "1":
        return "https://api-sandbox.asaas.com/v3"
    return "https://api.asaas.com/v3"


def _headers() -> dict:
    chave = os.getenv("ASAAS_API_KEY", "")
    if not chave:
        raise RuntimeError("ASAAS_API_KEY não configurado no servidor")
    return {
        "access_token": chave,
        "Content-Type": "application/json",
        "User-Agent": "HexaStore/1.0",
    }


def _request(method: str, path: str, **kwargs) -> dict:
    url = f"{_base_url()}{path}"
    with httpx.Client(timeout=15.0) as client:
        resp = client.request(method, url, headers=_headers(), **kwargs)

    if resp.status_code >= 400:
        log.error("Asaas %s %s -> %s %s", method, path, resp.status_code, resp.text[:500])
        # A resposta de erro do Asaas vem num formato padronizado
        # ({"errors": [{"code":..., "description": ...}]}); tentamos
        # extrair a descrição pra propagar uma mensagem útil.
        try:
            dados = resp.json()
            erros = dados.get("errors") or []
            detalhe = (
                "; ".join(e.get("description", str(e)) for e in erros)
                if erros
                else resp.text[:200]
            )
        except Exception:
            detalhe = resp.text[:200]
        raise RuntimeError(f"Asaas {method} {path} falhou ({resp.status_code}): {detalhe}")

    return resp.json() if resp.content else {}


def _ensure_customer(email: str, nome: str) -> str:
    """Devolve o id do cliente no Asaas, criando se ainda não existir.

    A chave de reuso é o e-mail — o Asaas permite buscar por esse campo e
    evita lotar a conta com clientes duplicados.
    """
    achados = _request("GET", "/customers", params={"email": email, "limit": 1})
    dados = achados.get("data") or []
    if dados:
        return str(dados[0]["id"])

    corpo = {
        "name": nome or email.split("@")[0] or "Cliente",
        "email": email,
        "cpfCnpj": _CPF_TESTE_SANDBOX,
    }
    criado = _request("POST", "/customers", json=corpo)
    return str(criado["id"])


def create_pix_payment(
    amount: float,
    description: str,
    payer_email: str,
    payer_name: str,
    external_reference: str,
    notification_url: Optional[str] = None,
) -> PixPayment:
    """Gera uma cobrança Pix no Asaas e devolve QR Code + copia-e-cola.

    O `notification_url` não é usado por cobrança no Asaas — eles enviam
    webhook a partir de uma URL única cadastrada no painel. Mantive o
    parâmetro na assinatura pra não acoplar o callsite ao PSP.
    """
    del notification_url

    customer_id = _ensure_customer(payer_email, payer_name)
    # Damos sempre 1 dia de validade — Pix costuma ser pago na hora, mas
    # evita que o link "morra" se o cliente deixar pra depois.
    vencimento = (date.today() + timedelta(days=1)).isoformat()

    corpo = {
        "customer": customer_id,
        "billingType": "PIX",
        "value": round(float(amount), 2),
        "dueDate": vencimento,
        "description": description,
        "externalReference": external_reference,
    }
    cobranca = _request("POST", "/payments", json=corpo)
    pay_id = str(cobranca["id"])
    status = str(cobranca.get("status", "PENDING")).lower()

    # O QR Code vem de um endpoint separado — o primeiro POST só cria a
    # cobrança, a imagem e o copia-e-cola saem desta segunda chamada.
    qr = _request("GET", f"/payments/{pay_id}/pixQrCode")

    return {
        "id": pay_id,
        "status": status,
        "qr_code": qr.get("payload", ""),
        "qr_code_base64": qr.get("encodedImage", ""),
        "ticket_url": cobranca.get("invoiceUrl") or cobranca.get("bankSlipUrl"),
    }


# Mapeamento dos status do Asaas para o nosso vocabulário interno.
# Centralizado aqui pra não repetir a lógica em `get_payment_status` e
# `parse_webhook` e manter tudo consistente se o Asaas introduzir novos.
_STATUS_APROVADO = {"RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"}
_STATUS_REEMBOLSADO = {
    "REFUNDED",
    "REFUND_REQUESTED",
    "CHARGEBACK_REQUESTED",
    "CHARGEBACK_DISPUTE",
}
_STATUS_CANCELADO = {"OVERDUE", "DELETED", "CANCELED", "CANCELLED"}


def _traduzir_status(raw: str) -> str:
    raw = raw.upper()
    if raw in _STATUS_APROVADO:
        return "approved"
    if raw in _STATUS_REEMBOLSADO:
        return "refunded"
    if raw in _STATUS_CANCELADO:
        return "cancelled"
    return "pending"


def get_payment_status(payment_id: str) -> str:
    cobranca = _request("GET", f"/payments/{payment_id}")
    return _traduzir_status(str(cobranca.get("status", "")))


def parse_webhook(body: dict) -> Optional[dict]:
    """Extrai {payment_id, status} do payload de webhook do Asaas.

    Retorna `None` quando o payload não carrega um pagamento — isso
    acontece com eventos puramente informativos que podemos ignorar.
    """
    if not isinstance(body, dict):
        return None
    pagamento = body.get("payment") or {}
    pay_id = pagamento.get("id")
    if not pay_id:
        return None
    return {
        "payment_id": str(pay_id),
        "status": _traduzir_status(str(pagamento.get("status", ""))),
    }
