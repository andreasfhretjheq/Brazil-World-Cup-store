/**
 * Rotas de catálogo — leitura pública dos produtos.
 */
import { Router } from "express";

import { db } from "../database/connection.js";

export const rotaProdutos = Router();

rotaProdutos.get("/", (_req, res) => {
  const produtos = db
    .prepare("SELECT * FROM products ORDER BY featured DESC, id ASC")
    .all();
  res.json(produtos);
});

rotaProdutos.get("/:id", (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(404).json({ detail: "Produto não encontrado" });
  }
  const produto = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!produto) {
    return res.status(404).json({ detail: "Produto não encontrado" });
  }
  res.json(produto);
});
