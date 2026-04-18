# Brazil World Cup Store (Hexa Store)

E-commerce tema Copa do Mundo 2026, focado em camisa do Brasil. Stack:

- **Backend**: Node 20 + Express + better-sqlite3, integração Pix via Asaas.
- **Frontend**: React + Vite + TypeScript + Tailwind.
- **Autenticação**: JWT com senhas em bcrypt.

## Rodando local

### Backend

```bash
cd backend
cp .env.example .env          # preencher ASAAS_API_KEY
npm install
npm run dev
```

API sobe em http://localhost:8000 e o banco SQLite fica em `backend/app.db`
(em produção, cai no volume persistente `/data/app.db`).

### Frontend

```bash
cd frontend
cp .env.example .env          # já aponta pra http://localhost:8000
npm install
npm run dev
```

Frontend sobe em http://localhost:5173.

## Pix (Asaas)

- O backend detecta sandbox/produção pela própria chave (se tem `hmlg`, é sandbox).
- Na criação do pedido com `payment_method = "pix"`, o backend cria a cobrança
  no Asaas e devolve `qr_code` (copia-e-cola) + `qr_code_base64` (imagem PNG).
- O frontend faz polling em `GET /orders/{id}` a cada 4s; o backend consulta
  o status no Asaas on-demand pra refletir pagamento mesmo sem webhook.
- Pra receber webhook, cadastrar a URL no painel do Asaas apontando pra
  `POST /payments/webhook` (URL pública do backend).

## Estrutura

```
backend/
  src/
    index.js           Express bootstrap (schema + seed + rotas)
    db.js              better-sqlite3 + schema
    auth.js            JWT + bcrypt + middleware
    payments.js        integração Asaas (Pix)
    seed.js            catálogo inicial (idempotente)
    routes/
      auth.js          /auth/register, /auth/login, /auth/me
      products.js      /products
      cart.js          /cart
      orders.js        /orders (cria cobrança Pix no POST)
      payments.js      /payments/webhook
  Dockerfile           imagem pra Fly.io (compila better-sqlite3)
frontend/
  src/
    pages/             Home, Products, ProductDetail, Cart, Checkout, Orders, Login, Register
    context/           AuthContext, CartContext
    components/        Navbar, Footer, ProductCard
    api.ts             cliente axios + tipos
```

## Deploy

- **Backend (Fly.io)**: o Dockerfile inclui tudo o que a Fly precisa. Basta
  `fly launch` no diretório `backend/` e configurar o secret `ASAAS_API_KEY`.
  Volume em `/data` pro SQLite sobreviver a redeploys.
- **Frontend (Vercel/Netlify/Cloudflare Pages)**: `npm run build` na pasta
  `frontend/` gera `dist/` pronto pra publicar em qualquer CDN estática.
  Setar `VITE_API_URL` apontando pro backend.

## Observações

- O produto "Produto Teste Pix - R$ 5,10" existe só pra validar o fluxo Pix
  sem comprometer muito em testes reais. Preço vem do seed.
- Em sandbox, o QR Code não funciona em apps de banco reais — a confirmação
  é feita via API (`POST /payments/{id}/receiveInCash`).
