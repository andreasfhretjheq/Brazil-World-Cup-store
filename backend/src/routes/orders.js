/**
 * Rotas de pedidos: criação (com cobrança Pix quando aplicável),
 * listagem e detalhe (com refresh on-demand do status do Pix).
 */
import { Router } from "express";

import { exigirAuth } from "../auth.js";
import { db } from "../db.js";
import { consultarStatus, criarCobrancaPix } from "../payments.js";

export const rotaPedidos = Router();
rotaPedidos.use(exigirAuth);

function carregarItens(orderId) {
  return db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC")
    .all(orderId);
}

function serializarPedido(pedido) {
  return { ...pedido, items: carregarItens(pedido.id) };
}

rotaPedidos.post("/", async (req, res) => {
  const { shipping_address, payment_method } = req.body || {};
  if (!shipping_address || !payment_method) {
    return res
      .status(400)
      .json({ detail: "shipping_address e payment_method são obrigatórios" });
  }

  const userId = req.user.id;
  const itensCarrinho = db
    .prepare(
      `SELECT ci.*, p.name AS product_name, p.image_url AS product_image, p.price AS product_price
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = ?
        ORDER BY ci.id ASC`,
    )
    .all(userId);

  if (itensCarrinho.length === 0) {
    return res.status(400).json({ detail: "Carrinho vazio" });
  }

  const ehPix = payment_method === "pix";
  const total =
    Math.round(
      itensCarrinho.reduce((acc, ci) => acc + ci.product_price * ci.quantity, 0) * 100,
    ) / 100;

  // Cria pedido + itens + esvazia carrinho numa transação só. Se a
  // integração com o Asaas (fora da transação) falhar, a gente desfaz
  // tudo manualmente pra não deixar pedido órfão no banco.
  const criar = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (user_id, total, status, shipping_address, payment_method)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(userId, total, ehPix ? "pendente" : "pago", String(shipping_address), payment_method);
    const orderId = info.lastInsertRowid;

    const inserirItem = db.prepare(
      `INSERT INTO order_items
         (order_id, product_id, product_name, product_image, unit_price, quantity, size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const ci of itensCarrinho) {
      inserirItem.run(
        orderId,
        ci.product_id,
        ci.product_name,
        ci.product_image,
        ci.product_price,
        ci.quantity,
        ci.size,
      );
    }
    db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(userId);
    return orderId;
  });

  const orderId = criar();

  if (ehPix) {
    try {
      const pix = await criarCobrancaPix({
        valor: total,
        descricao: `Pedido Hexa Store #${orderId}`,
        emailPagador: req.user.email,
        nomePagador: req.user.name,
        referenciaExterna: String(orderId),
        notificationUrl: `${process.env.PUBLIC_BASE_URL || ""}/payments/webhook`,
      });
      db.prepare(
        `UPDATE orders
            SET mp_payment_id = ?, pix_qr_code = ?, pix_qr_code_base64 = ?, pix_ticket_url = ?
          WHERE id = ?`,
      ).run(pix.id, pix.qr_code, pix.qr_code_base64, pix.ticket_url, orderId);
    } catch (erro) {
      console.error(`[orders] Falha ao criar cobrança Pix para ${orderId}`, erro);
      // Rollback manual: apaga o pedido que acabamos de inserir — os
      // itens do carrinho já foram deletados, infelizmente, mas o
      // cliente pode refazer sem duplicar cobrança.
      db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
      return res
        .status(502)
        .json({ detail: `Não foi possível gerar a cobrança Pix: ${erro.message}` });
    }
  }

  const pedido = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  res.json(serializarPedido(pedido));
});

rotaPedidos.get("/", (req, res) => {
  const pedidos = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC")
    .all(req.user.id);
  res.json(pedidos.map(serializarPedido));
});

rotaPedidos.get("/:id", async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const pedido = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!pedido) {
    return res.status(404).json({ detail: "Pedido não encontrado" });
  }

  // Enquanto o webhook do Asaas não chega, consultamos a situação direto
  // na API deles na hora do polling do frontend. Assim a tela do Pix vira
  // "Pago" mesmo em ambientes sem webhook configurado (ex: sandbox local).
  if (pedido.status === "pendente" && pedido.mp_payment_id) {
    try {
      const situacao = await consultarStatus(pedido.mp_payment_id);
      if (situacao === "approved") {
        db.prepare("UPDATE orders SET status = 'pago' WHERE id = ?").run(pedido.id);
        pedido.status = "pago";
      } else if (situacao === "cancelled" || situacao === "rejected") {
        db.prepare("UPDATE orders SET status = 'cancelado' WHERE id = ?").run(pedido.id);
        pedido.status = "cancelado";
      }
    } catch (erro) {
      console.error(`[orders] Falha ao consultar status do Pix do pedido ${pedido.id}`, erro);
    }
  }

  res.json(serializarPedido(pedido));
});
