/**
 * Rotas de autenticação: cadastro, login e perfil do usuário logado.
 */
import { Router } from "express";

import { conferirSenha, exigirAuth, gerarToken, hashSenha } from "../auth.js";
import { db } from "../db.js";

export const rotaAuth = Router();

function respostaLogin(usuario) {
  return {
    access_token: gerarToken(usuario.id),
    token_type: "bearer",
    user: { id: usuario.id, email: usuario.email, name: usuario.name },
  };
}

rotaAuth.post("/register", (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) {
    return res.status(400).json({ detail: "E-mail, nome e senha são obrigatórios" });
  }
  const emailNormalizado = String(email).trim().toLowerCase();

  const existente = db.prepare("SELECT id FROM users WHERE email = ?").get(emailNormalizado);
  if (existente) {
    return res.status(400).json({ detail: "E-mail já cadastrado" });
  }

  const info = db
    .prepare("INSERT INTO users (email, name, hashed_password) VALUES (?, ?, ?)")
    .run(emailNormalizado, String(name), hashSenha(String(password)));

  const usuario = db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(info.lastInsertRowid);

  res.json(respostaLogin(usuario));
});

rotaAuth.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: "E-mail e senha são obrigatórios" });
  }

  const usuario = db
    .prepare("SELECT id, email, name, hashed_password FROM users WHERE email = ?")
    .get(String(email).trim().toLowerCase());

  if (!usuario || !conferirSenha(String(password), usuario.hashed_password)) {
    return res.status(401).json({ detail: "E-mail ou senha incorretos" });
  }

  res.json(respostaLogin(usuario));
});

rotaAuth.get("/me", exigirAuth, (req, res) => {
  res.json(req.user);
});
