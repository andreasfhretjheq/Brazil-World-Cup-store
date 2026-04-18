import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Minus, Plus, Truck, ShieldCheck, Package } from "lucide-react";
import api, { Product } from "../api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Product>(`/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        const sizes = res.data.sizes.split(",");
        setSize(sizes.includes("M") ? "M" : sizes[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async () => {
    if (!product) return;
    if (!user) {
      navigate("/login?redirect=/products/" + product.id);
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      await addItem(product.id, quantity, size);
      setMessage("Adicionado ao carrinho!");
    } catch {
      setMessage("Erro ao adicionar ao carrinho");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Carregando...</div>;
  }
  if (!product) {
    return <div className="py-20 text-center text-gray-500">Produto não encontrado</div>;
  }

  const sizes = product.sizes.split(",");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-gray-600 hover:text-green-700"
      >
        <ChevronLeft size={16} /> Voltar
      </button>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-gray-100">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/800x800/16a34a/fbbf24?text=Brasil+2026";
            }}
          />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-green-700">
            {product.category} · Copa 2026
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-green-700">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-sm text-gray-500">à vista no Pix</span>
          </div>
          <p className="text-sm text-gray-600">
            ou 10x de R$ {(product.price / 10).toFixed(2).replace(".", ",")} sem juros
          </p>

          <p className="mt-6 text-gray-700">{product.description}</p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-gray-900">Tamanho</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-[3rem] rounded-lg border-2 px-4 py-2 text-sm font-bold transition ${
                    size === s
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-green-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-gray-900">Quantidade</label>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-gray-100"
                aria-label="Diminuir"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-[3rem] text-center font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-gray-100"
                aria-label="Aumentar"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="mt-6 w-full rounded-full bg-yellow-400 py-4 text-lg font-extrabold text-green-900 shadow-lg transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {adding ? "Adicionando..." : "Adicionar ao carrinho"}
          </button>

          {message && (
            <div className="mt-3 rounded-lg bg-green-100 px-4 py-2 text-center text-sm font-semibold text-green-800">
              {message}
            </div>
          )}

          <div className="mt-8 space-y-3 text-sm">
            <Info icon={<Truck size={16} />} text="Frete grátis acima de R$ 299 para todo o Brasil" />
            <Info icon={<ShieldCheck size={16} />} text="Produto oficial com nota fiscal e garantia" />
            <Info icon={<Package size={16} />} text="Troca facilitada em até 30 dias" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-700">
      <span className="text-green-700">{icon}</span> {text}
    </div>
  );
}
