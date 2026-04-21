/**
 * Rotas do carrinho: listar, adicionar, atualizar, remover e esvaziar.
 *
 * Toda rota aqui exige autenticação; o carrinho é sempre escopado ao
 * `req.user.id` pra evitar que um usuário veja/altere o carrinho de outro.
 */
import { Router } from "express";

import { exigirAuth } from "../services/auth.js";
import { db } from "../database/connection.js";

export const rotaCarrinho = Router();
rotaCarrinho.use(exigirAuth);

function itemComProduto(item) {
  const produto = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
  return {
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    size: item.size,
    product: produto,
  };
}

rotaCarrinho.get("/", (req, res) => {
  const itens = db
    .prepare("SELECT * FROM cart_items WHERE user_id = ? ORDER BY id ASC")
    .all(req.user.id);
  res.json(itens.map(itemComProduto));
});

rotaCarrinho.post("/items", (req, res) => {
  const { product_id, quantity = 1, size = "M" } = req.body || {};
  const productId = Number.parseInt(product_id, 10);
  const qty = Number.parseInt(quantity, 10);

  if (!Number.isFinite(productId)) {
    return res.status(400).json({ detail: "product_id inválido" });
  }
  if (!Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ detail: "Quantidade inválida" });
  }

  const produto = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!produto) {
    return res.status(404).json({ detail: "Produto não encontrado" });
  }

  // Se já existe uma linha com o mesmo produto+tamanho pro usuário, a
  // gente soma a quantidade em vez de criar duplicata.
  const jaNoCarrinho = db
    .prepare(
      "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
    )
    .get(req.user.id, productId, String(size));

  let itemId;
  if (jaNoCarrinho) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(
      jaNoCarrinho.quantity + qty,
      jaNoCarrinho.id,
    );
    itemId = jaNoCarrinho.id;
  } else {
    const info = db
      .prepare(
        "INSERT INTO cart_items (user_id, product_id, quantity, size) VALUES (?, ?, ?, ?)",
      )
      .run(req.user.id, productId, qty, String(size));
    itemId = info.lastInsertRowid;
  }

  const item = db.prepare("SELECT * FROM cart_items WHERE id = ?").get(itemId);
  res.json(itemComProduto(item));
});

rotaCarrinho.patch("/items/:id", (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const item = db
    .prepare("SELECT * FROM cart_items WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!item) {
    return res.status(404).json({ detail: "Item não encontrado" });
  }

  const { quantity, size } = req.body || {};
  let novaQtd = item.quantity;
  let novoSize = item.size;

  if (quantity !== undefined && quantity !== null) {
    const n = Number.parseInt(quantity, 10);
    if (!Number.isFinite(n) || n < 1) {
      return res.status(400).json({ detail: "Quantidade inválida" });
    }
    novaQtd = n;
  }
  if (size !== undefined && size !== null) {
    novoSize = String(size);
  }

  db.prepare("UPDATE cart_items SET quantity = ?, size = ? WHERE id = ?").run(
    novaQtd,
    novoSize,
    id,
  );
  const atualizado = db.prepare("SELECT * FROM cart_items WHERE id = ?").get(id);
  res.json(itemComProduto(atualizado));
});

rotaCarrinho.delete("/items/:id", (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const item = db
    .prepare("SELECT id FROM cart_items WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!item) {
    return res.status(404).json({ detail: "Item não encontrado" });
  }
  db.prepare("DELETE FROM cart_items WHERE id = ?").run(id);
  res.status(204).end();
});

rotaCarrinho.delete("/", (req, res) => {
  db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(req.user.id);
  res.status(204).end();
});
