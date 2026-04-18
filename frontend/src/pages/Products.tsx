import { useEffect, useState } from "react";
import api, { Product } from "../api";
import ProductCard from "../components/ProductCard";
import { Search } from "lucide-react";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("todos");

  useEffect(() => {
    api
      .get<Product[]>("/products")
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["todos", ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "todos" || p.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-green-900">Catálogo Copa 2026</h1>
        <p className="text-gray-600">Tudo para o torcedor brasileiro rumo ao hexa</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar camisa, boné, caneca..."
            className="w-full rounded-full border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                category === c
                  ? "bg-green-700 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Carregando produtos...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          Nenhum produto encontrado. Tente ajustar os filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
