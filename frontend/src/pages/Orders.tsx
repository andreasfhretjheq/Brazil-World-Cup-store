import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, CheckCircle2 } from "lucide-react";
import api, { Order } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<Order[]>("/orders")
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="py-20 text-center">
        <Link to="/login" className="text-green-700 hover:underline">
          Faça login para ver seus pedidos
        </Link>
      </div>
    );
  }

  if (loading) return <div className="py-20 text-center text-gray-500">Carregando pedidos...</div>;

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Package className="mx-auto mb-4 text-gray-400" size={64} />
        <h1 className="text-2xl font-extrabold text-gray-900">Ainda sem pedidos</h1>
        <p className="mt-2 text-gray-600">Que tal começar sua jornada rumo ao hexa?</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-full bg-yellow-400 px-6 py-3 font-bold text-green-900 hover:bg-yellow-300"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold text-green-900">Meus pedidos</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
              <div>
                <div className="text-sm text-gray-500">Pedido</div>
                <div className="font-bold text-gray-900">#{order.id}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Data</div>
                <div className="font-bold text-gray-900">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total</div>
                <div className="font-extrabold text-green-700">
                  R$ {order.total.toFixed(2).replace(".", ",")}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                  <CheckCircle2 size={14} /> Pago
                </div>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  <img
                    src={it.product_image}
                    alt={it.product_name}
                    className="h-14 w-14 rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100/16a34a/fbbf24?text=BR";
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{it.product_name}</div>
                    <div className="text-xs text-gray-500">
                      Qtde {it.quantity} · Tam {it.size}
                    </div>
                  </div>
                  <div className="font-bold text-gray-900">
                    R$ {(it.unit_price * it.quantity).toFixed(2).replace(".", ",")}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-gray-600">
              <strong>Entrega em:</strong> {order.shipping_address}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
