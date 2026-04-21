/**
 * Integração Pix via Asaas.
 *
 * Os endpoints e o host (sandbox vs produção) são decididos pela própria
 * chave de API: se contém `hmlg`, usamos o sandbox; caso contrário, produção.
 */

// CPF de teste aceito no sandbox do Asaas. Serve só pra criar o "customer"
// quando não temos o CPF real do pagador (caso típico de e-commerce com
// cadastro leve por e-mail). Em produção, o ideal é coletar o CPF.
const CPF_TESTE_SANDBOX = "24971563792";

function baseUrl() {
  const chave = process.env.ASAAS_API_KEY || "";
  if (chave.toLowerCase().includes("hmlg") || process.env.ASAAS_SANDBOX === "1") {
    return "https://api-sandbox.asaas.com/v3";
  }
  return "https://api.asaas.com/v3";
}

function headers() {
  const chave = process.env.ASAAS_API_KEY || "";
  if (!chave) {
    throw new Error("ASAAS_API_KEY não configurado no servidor");
  }
  return {
    access_token: chave,
    "Content-Type": "application/json",
    "User-Agent": "HexaStore/1.0",
  };
}

async function chamar(method, path, { body, query } = {}) {
  const url = new URL(baseUrl() + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }
  }

  const resp = await fetch(url, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    // A resposta de erro do Asaas vem num formato padronizado
    // ({"errors": [{"code":..., "description": ...}]}); tentamos
    // extrair a descrição pra propagar uma mensagem útil.
    const texto = await resp.text();
    let detalhe = texto.slice(0, 200);
    try {
      const parsed = JSON.parse(texto);
      if (Array.isArray(parsed.errors) && parsed.errors.length) {
        detalhe = parsed.errors.map((e) => e.description || JSON.stringify(e)).join("; ");
      }
    } catch {
      /* mantém o texto bruto */
    }
    console.error(`[asaas] ${method} ${path} -> ${resp.status} ${texto.slice(0, 500)}`);
    throw new Error(`Asaas ${method} ${path} falhou (${resp.status}): ${detalhe}`);
  }

  const raw = await resp.text();
  return raw ? JSON.parse(raw) : {};
}

/**
 * Devolve o id do cliente no Asaas, criando se ainda não existir.
 * A chave de reuso é o e-mail — o Asaas permite buscar por esse campo e
 * evita lotar a conta com clientes duplicados.
 */
async function garantirCliente(email, nome) {
  const existentes = await chamar("GET", "/customers", { query: { email, limit: 1 } });
  if (Array.isArray(existentes?.data) && existentes.data.length > 0) {
    return String(existentes.data[0].id);
  }

  const criado = await chamar("POST", "/customers", {
    body: {
      name: nome || email.split("@")[0] || "Cliente",
      email,
      cpfCnpj: CPF_TESTE_SANDBOX,
    },
  });
  return String(criado.id);
}

/**
 * Gera uma cobrança Pix no Asaas e devolve QR Code + copia-e-cola.
 *
 * O parâmetro `notificationUrl` não é usado — o Asaas dispara webhook a
 * partir de uma URL única cadastrada no painel, não por cobrança. Mantenho
 * na assinatura pra não acoplar o callsite ao PSP.
 */
export async function criarCobrancaPix({
  valor,
  descricao,
  emailPagador,
  nomePagador,
  referenciaExterna,
  // eslint-disable-next-line no-unused-vars
  notificationUrl,
}) {
  const customerId = await garantirCliente(emailPagador, nomePagador);

  // 1 dia de validade — Pix costuma ser pago na hora, mas evita que o
  // link "morra" se o cliente deixar pra depois.
  const amanha = new Date();
  amanha.setUTCDate(amanha.getUTCDate() + 1);
  const vencimento = amanha.toISOString().slice(0, 10);

  const cobranca = await chamar("POST", "/payments", {
    body: {
      customer: customerId,
      billingType: "PIX",
      value: Math.round(valor * 100) / 100,
      dueDate: vencimento,
      description: descricao,
      externalReference: referenciaExterna,
    },
  });

  // O QR Code vem de um endpoint separado — o primeiro POST só cria a
  // cobrança, a imagem e o copia-e-cola saem desta segunda chamada.
  const qr = await chamar("GET", `/payments/${cobranca.id}/pixQrCode`);

  return {
    id: String(cobranca.id),
    status: String(cobranca.status || "PENDING").toLowerCase(),
    qr_code: qr.payload || "",
    qr_code_base64: qr.encodedImage || "",
    ticket_url: cobranca.invoiceUrl || cobranca.bankSlipUrl || null,
  };
}

// Mapeamento dos status do Asaas para o nosso vocabulário interno.
// Centralizado aqui pra não repetir a lógica em `consultarStatus` e
// `interpretarWebhook` e manter tudo consistente se o Asaas introduzir novos.
const STATUS_APROVADO = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const STATUS_REEMBOLSADO = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
]);
const STATUS_CANCELADO = new Set(["OVERDUE", "DELETED", "CANCELED", "CANCELLED"]);

function traduzirStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (STATUS_APROVADO.has(s)) return "approved";
  if (STATUS_REEMBOLSADO.has(s)) return "refunded";
  if (STATUS_CANCELADO.has(s)) return "cancelled";
  return "pending";
}

export async function consultarStatus(paymentId) {
  const cobranca = await chamar("GET", `/payments/${paymentId}`);
  return traduzirStatus(cobranca.status);
}

/**
 * Extrai {paymentId, status} do payload de webhook do Asaas.
 * Retorna `null` quando o payload não carrega um pagamento — isso
 * acontece com eventos puramente informativos que podemos ignorar.
 */
export function interpretarWebhook(body) {
  if (!body || typeof body !== "object") return null;
  const pagamento = body.payment || {};
  if (!pagamento.id) return null;
  return {
    paymentId: String(pagamento.id),
    status: traduzirStatus(pagamento.status),
  };
}
