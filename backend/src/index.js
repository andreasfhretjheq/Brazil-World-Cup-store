/**
 * Bootstrap do servidor Express: carrega o .env, prepara o banco, popula
 * o catálogo e sobe as rotas.
 */
import "dotenv/config";

import cors from "cors";
import express from "express";

import { inicializarSchema } from "./database/connection.js";
import { popularCatalogo } from "./database/seed.js";
import { rotaAuth } from "./routes/auth.js";
import { rotaCarrinho } from "./routes/cart.js";
import { rotaPagamentos } from "./routes/payments.js";
import { rotaPedidos } from "./routes/orders.js";
import { rotaProdutos } from "./routes/products.js";

inicializarSchema();
popularCatalogo();

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS liberado — o frontend está hospedado em outro domínio.
// Não remover: a plataforma de deploy precisa disto pra rotear.
app.use(cors({ origin: true, credentials: true }));

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", rotaAuth);
app.use("/products", rotaProdutos);
app.use("/cart", rotaCarrinho);
app.use("/orders", rotaPedidos);
app.use("/payments", rotaPagamentos);

// Handler global de erros — evita vazar stack trace pro cliente e
// garante que erros assíncronos que não foram capturados ainda virem 500.
app.use((err, _req, res, _next) => {
  console.error("[http] erro não tratado:", err);
  res.status(500).json({ detail: "Erro interno" });
});

const PORT = Number.parseInt(process.env.PORT || "8000", 10);
app.listen(PORT, () => {
  console.log(`[hexa-store] ouvindo em http://localhost:${PORT}`);
});
