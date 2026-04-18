import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Cart() {
  const { items, updateItem, removeItem, subtotal, loading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 text-green-700" size={64} />
        <h1 className="text-2xl font-extrabold text-gray-900">Seu carrinho está esperando</h1>
        <p className="mt-2 text-gray-600">Entre na sua conta para ver seus produtos salvos.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/login?redirect=/cart"
            className="rounded-full bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800"
          >
            Entrar
          </Link>
          <Link
            to="/register?redirect=/cart"
            className="rounded-full border-2 border-green-700 px-6 py-3 font-bold text-green-700 hover:bg-green-50"
          >
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Carregando carrinho...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 text-gray-400" size={64} />
        <h1 className="text-2xl font-extrabold text-gray-900">Seu carrinho está vazio</h1>
        <p className="mt-2 text-gray-600">Que tal garantir a camisa oficial do Brasil 2026?</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-full bg-yellow-400 px-6 py-3 font-bold text-green-900 hover:bg-yellow-300"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  const shipping = subtotal >= 299 ? 0 : 29.9;
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold text-green-900">Seu carrinho</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <img
                src={item.product.image_url}
                alt={item.product.name}
                className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/200x200/16a34a/fbbf24?text=BR";
                }}
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{item.product.name}</h3>
                <p className="text-sm text-gray-500">Tamanho: {item.size}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
                    <button
                      onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                      className="p-2 hover:bg-gray-100"
                      aria-label="Diminuir"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100"
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-green-700">
                  R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                </div>
                <div className="text-xs text-gray-500">
                  R$ {item.product.price.toFixed(2).replace(".", ",")} cada
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Resumo do pedido</h2>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={`R$ ${subtotal.toFixed(2).replace(".", ",")}`} />
            <Row
              label="Frete"
              value={shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`}
            />
            <hr className="my-2" />
            <Row label="Total" value={`R$ ${total.toFixed(2).replace(".", ",")}`} bold />
            <p className="text-xs text-gray-500">
              ou 10x de R$ {(total / 10).toFixed(2).replace(".", ",")} sem juros
            </p>
          </div>
          <button
            onClick={() => navigate("/checkout")}
            className="mt-6 w-full rounded-full bg-yellow-400 py-3 font-extrabold text-green-900 shadow hover:bg-yellow-300"
          >
            Finalizar compra
          </button>
          <Link
            to="/products"
            className="mt-3 block text-center text-sm text-gray-600 hover:underline"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-extrabold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
