/**
 * Autenticação via JWT com senhas hasheadas em bcrypt.
 *
 * O middleware `exigirAuth` valida o header Authorization, resolve o
 * usuário e anexa em `req.user` pras rotas consumirem.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { db } from "../database/connection.js";

const SEGREDO = process.env.JWT_SECRET || "worldcup2026-brasil-hexa-secret-key-change-me";
// Token vale uma semana — curto o bastante pra mitigar risco em caso de vazamento,
// longo o bastante pra não precisar pedir login a cada sessão.
const VALIDADE = "7d";

export function hashSenha(senha) {
  return bcrypt.hashSync(senha, 10);
}

export function conferirSenha(senhaPlain, hashArmazenado) {
  try {
    return bcrypt.compareSync(senhaPlain, hashArmazenado);
  } catch {
    // Hash corrompido no banco — trata como senha incorreta
    return false;
  }
}

export function gerarToken(userId) {
  return jwt.sign({ sub: String(userId) }, SEGREDO, { expiresIn: VALIDADE });
}

/**
 * Middleware: exige Authorization: Bearer <token>.
 * Devolve 401 quando o token é ausente/inválido/expirado ou quando o
 * usuário referenciado não existe mais.
 */
export function exigirAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [esquema, token] = header.split(" ");
  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ detail: "Credenciais inválidas" });
  }

  let payload;
  try {
    payload = jwt.verify(token, SEGREDO);
  } catch {
    return res.status(401).json({ detail: "Credenciais inválidas" });
  }

  const userId = Number.parseInt(payload.sub, 10);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ detail: "Credenciais inválidas" });
  }

  const usuario = db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(userId);
  if (!usuario) {
    return res.status(401).json({ detail: "Credenciais inválidas" });
  }

  req.user = usuario;
  next();
}
