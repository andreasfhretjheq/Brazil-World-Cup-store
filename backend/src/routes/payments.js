/**
 * Webhook do Asaas. A URL pública precisa estar cadastrada no painel do
 * Asaas (Configurações → Notificações) pra esse endpoint receber eventos.
 */
import { Router } from "express";

import { db } from "../database/connection.js";
import { interpretarWebhook } from "../services/payments.js";

export const rotaPagamentos = Router();

rotaPagamentos.post("/webhook", (req, res) => {
  const evento = interpretarWebhook(req.body);
  if (!evento) {
    return res.json({ status: "ignored" });
  }

  const pedido = db
    .prepare("SELECT id, status FROM orders WHERE mp_payment_id = ?")
    .get(evento.paymentId);
  if (!pedido) {
    return res.json({ status: "unknown_payment" });
  }

  // O Asaas manda o mesmo payload pra vários eventos (PAYMENT_CREATED,
  // PAYMENT_RECEIVED, etc). Só aplicamos as transições que nos interessam.
  if (evento.status === "approved" && pedido.status !== "pago") {
    db.prepare("UPDATE orders SET status = 'pago' WHERE id = ?").run(pedido.id);
    return res.json({ status: "ok", order_status: "pago" });
  }
  if (evento.status === "cancelled" && pedido.status !== "cancelado") {
    db.prepare("UPDATE orders SET status = 'cancelado' WHERE id = ?").run(pedido.id);
    return res.json({ status: "ok", order_status: "cancelado" });
  }

  res.json({ status: "ok", order_status: pedido.status });
});
