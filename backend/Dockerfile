# Imagem de build e runtime do backend da Hexa Store.
# Usamos a mesma imagem pra instalar deps + rodar, mantendo simples pra Fly.io.
FROM node:20-slim

# `better-sqlite3` precisa compilar extensões nativas — daí python + build tools.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalação de dependências separada pra aproveitar cache da camada.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8000
EXPOSE 8000

CMD ["node", "src/index.js"]
