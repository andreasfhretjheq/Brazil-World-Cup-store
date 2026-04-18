/**
 * Catálogo inicial da loja e função idempotente de seed.
 *
 * Os produtos vivem como "fonte da verdade" aqui no código. A função
 * `popularCatalogo` roda em toda inicialização mas só toca no banco
 * quando realmente há diferença, então é barato chamá-la sempre.
 */
import { db } from "./db.js";

export const PRODUTOS_INICIAIS = [
  {
    name: "Camisa Oficial Brasil 2026 - Amarela (Home)",
    description:
      "A icônica camisa amarela da Seleção Brasileira para a Copa do Mundo 2026. Tecido Dri-FIT ADV, design inspirado nas cinco estrelas e no sonho do hexa. Edição oficial para torcedores.",
    price: 349.9,
    image_url:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=800&q=80",
    category: "Camisa",
    stock: 150,
    sizes: "PP,P,M,G,GG,XGG",
    featured: 1,
  },
  {
    name: "Camisa Brasil 2026 - Azul (Away)",
    description:
      "A tradicional camisa reserva azul da Seleção Brasileira para 2026. Confortável, respirável e cheia de estilo para representar o Brasil em qualquer lugar do mundo.",
    price: 329.9,
    image_url:
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=800&q=80",
    category: "Camisa",
    stock: 120,
    sizes: "P,M,G,GG,XGG",
    featured: 1,
  },
  {
    name: "Camisa Brasil 2026 - Versão Jogador",
    description:
      "Versão profissional utilizada pelos atletas em campo. Tecnologia de absorção de suor e corte atlético. Para o torcedor que quer sentir-se em campo.",
    price: 649.9,
    image_url:
      "https://images.unsplash.com/photo-1614632537190-23e4146777db?auto=format&fit=crop&w=800&q=80",
    category: "Camisa",
    stock: 60,
    sizes: "P,M,G,GG",
    featured: 1,
  },
  {
    name: "Camisa Brasil 2026 - Infantil Amarela",
    description:
      "Versão infantil da camisa amarela da Seleção para a Copa 2026. Para os pequenos torcedores do hexa.",
    price: 229.9,
    image_url:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    category: "Camisa",
    stock: 80,
    sizes: "4,6,8,10,12,14",
    featured: 0,
  },
  {
    name: "Camisa Brasil 2026 - Feminina Amarela",
    description:
      "Modelagem feminina com caimento perfeito. Tecido leve e tecnologia de secagem rápida. Design oficial da Copa do Mundo 2026.",
    price: 349.9,
    image_url:
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80",
    category: "Camisa",
    stock: 90,
    sizes: "PP,P,M,G,GG",
    featured: 1,
  },
  {
    name: "Bola Oficial Copa do Mundo 2026",
    description:
      "Bola oficial da Copa do Mundo 2026 FIFA. Painéis termocolados e tecnologia de voo estável. Perfeita para treinos e jogos.",
    price: 899.9,
    image_url:
      "https://images.unsplash.com/photo-1614632537197-38a17061c2bd?auto=format&fit=crop&w=800&q=80",
    category: "Acessório",
    stock: 40,
    sizes: "Oficial",
    featured: 0,
  },
  {
    name: "Boné Seleção Brasileira 2026",
    description:
      "Boné oficial da CBF para a Copa do Mundo 2026. Ajustável, bordado em alta definição. Complete seu look de torcedor.",
    price: 129.9,
    image_url:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80",
    category: "Acessório",
    stock: 200,
    sizes: "Único",
    featured: 0,
  },
  {
    name: "Cachecol Torcedor Brasil 2026",
    description:
      "Cachecol oficial da torcida brasileira. Ideal para acompanhar os jogos da Copa 2026 com estilo e calor de hexa.",
    price: 89.9,
    image_url:
      "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=800&q=80",
    category: "Acessório",
    stock: 150,
    sizes: "Único",
    featured: 0,
  },
  {
    name: "Meião Oficial Brasil 2026",
    description:
      "Meião oficial da Seleção com tecnologia anti-atrito. Complete seu uniforme completo para jogar como um craque.",
    price: 79.9,
    image_url:
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
    category: "Acessório",
    stock: 120,
    sizes: "P,M,G",
    featured: 0,
  },
  {
    name: "Caneca Copa do Mundo 2026 - Brasil",
    description:
      "Caneca de cerâmica 350ml com a arte oficial da Copa 2026 e as estrelas do Brasil. Torcida matinal com estilo.",
    price: 49.9,
    image_url:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?auto=format&fit=crop&w=800&q=80",
    category: "Acessório",
    stock: 300,
    sizes: "350ml",
    featured: 0,
  },
  {
    name: "Produto Teste Pix - R$ 5,10",
    description:
      "Produto de teste para validar o fluxo de pagamento Pix com um valor baixo. Não representa mercadoria real; ao pagar, nada será enviado.",
    price: 5.1,
    image_url:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
    category: "Acessório",
    stock: 999,
    sizes: "Único",
    featured: 0,
  },
];

export function popularCatalogo() {
  // Migra o produto de teste legado (R$ 1,50 -> R$ 5,10) pro nome novo
  // antes do matching por nome abaixo — senão a gente duplicaria.
  db.prepare(
    `UPDATE products
        SET name = 'Produto Teste Pix - R$ 5,10', price = 5.10
      WHERE name = 'Produto Teste Pix - R$ 1,50'`,
  ).run();

  const buscarPorNome = db.prepare("SELECT id, price FROM products WHERE name = ?");
  const inserir = db.prepare(
    `INSERT INTO products (name, description, price, image_url, category, stock, sizes, featured)
     VALUES (@name, @description, @price, @image_url, @category, @stock, @sizes, @featured)`,
  );
  const atualizarPreco = db.prepare("UPDATE products SET price = ? WHERE id = ?");

  const tx = db.transaction((items) => {
    for (const item of items) {
      const existente = buscarPorNome.get(item.name);
      if (!existente) {
        inserir.run(item);
        continue;
      }
      // Produto de teste tem o preço definido aqui como "fonte da verdade"
      // — mantemos o banco alinhado pra facilitar trocar o valor sem
      // precisar abrir o SQLite à mão.
      if (item.name.includes("Produto Teste Pix") && existente.price !== item.price) {
        atualizarPreco.run(item.price, existente.id);
      }
    }
  });

  tx(PRODUTOS_INICIAIS);
}
