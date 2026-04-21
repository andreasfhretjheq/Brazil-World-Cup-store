/**
 * Conexão com o banco SQLite e definição do schema.
 *
 * Em produção (Fly.io), o banco fica no volume persistente em /data/app.db.
 * Em dev, cai na raiz do backend pra facilitar resetar à mão quando precisa.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = fs.existsSync("/data") ? "/data" : path.resolve(__dirname, "..");
fs.mkdirSync(DATA_DIR, { recursive: true });
export const DB_PATH = path.join(DATA_DIR, "app.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Cria as tabelas que ainda não existirem. `CREATE TABLE IF NOT EXISTS`
 * garante que chamadas repetidas não derrubam dados.
 */
export function inicializarSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      email           TEXT NOT NULL UNIQUE,
      name            TEXT NOT NULL,
      hashed_password TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      price       REAL NOT NULL,
      image_url   TEXT NOT NULL,
      category    TEXT NOT NULL,
      stock       INTEGER NOT NULL DEFAULT 100,
      sizes       TEXT NOT NULL DEFAULT 'P,M,G,GG',
      featured    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity   INTEGER NOT NULL DEFAULT 1,
      size       TEXT NOT NULL DEFAULT 'M'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total               REAL NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pago',
      shipping_address    TEXT NOT NULL,
      payment_method      TEXT NOT NULL,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      mp_payment_id       TEXT,
      pix_qr_code         TEXT,
      pix_qr_code_base64  TEXT,
      pix_ticket_url      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON orders(mp_payment_id);

    CREATE TABLE IF NOT EXISTS order_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id    INTEGER NOT NULL REFERENCES products(id),
      product_name  TEXT NOT NULL,
      product_image TEXT NOT NULL,
      unit_price    REAL NOT NULL,
      quantity      INTEGER NOT NULL,
      size          TEXT NOT NULL
    );
  `);
}
