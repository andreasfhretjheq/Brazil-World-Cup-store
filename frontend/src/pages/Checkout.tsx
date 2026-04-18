import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, Copy, QrCode, Loader2 } from "lucide-react";
import api, { Order } from "../api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, refresh } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [payment, setPayment] = useState<"pix" | "credit_card" | "boleto">("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  const isPix = order?.payment_method === "pix";
  const isPaid = order?.status === "pago";

  // Polling do Pix: a cada 4s consultamos /orders/{id}; o backend faz o
  // lazy-refresh junto ao Asaas e devolve status="pago" assim que cair.
  useEffect(() => {
    if (!order || !isPix || isPaid) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get<Order>(`/orders/${order.id}`);
        setOrder(res.data);
      } catch {
        // Erro pontual no polling não deve quebrar a tela — tenta de novo.
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [order, isPix, isPaid]);

  if (!user) return <Navigate to="/login?redirect=/checkout" replace />;
  if (items.length === 0 && !order) return <Navigate to="/cart" replace />;

  const shipping = subtotal >= 299 ? 0 : 29.9;
  const total = subtotal + shipping;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const address = `${name} - ${street}, ${number} - ${city}/${state} - CEP ${cep}`;
      const res = await api.post<Order>("/orders", {
        shipping_address: address,
        payment_method: payment,
      });
      setOrder(res.data);
      await refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Não foi possível concluir o pedido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    if (!order?.pix_qr_code) return;
    try {
      await navigator.clipboard.writeText(order.pix_qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  // Tela do Pix: QR Code + copia-e-cola enquanto o pagamento não cai.
  if (order && isPix && !isPaid) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border-2 border-green-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-green-800">
            <QrCode size={22} />
            <h1 className="text-2xl font-extrabold">Pague com Pix</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Pedido <strong>#{order.id}</strong> · Total{" "}
            <strong>R$ {order.total.toFixed(2).replace(".", ",")}</strong>
          </p>

          {order.pix_qr_code_base64 ? (
            <div className="mt-5 flex justify-center">
              <img
                src={`data:image/png;base64,${order.pix_qr_code_base64}`}
                alt="QR Code Pix"
                className="h-64 w-64 rounded-lg border border-gray-200"
              />
            </div>
          ) : (
            <div className="mt-5 flex h-64 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              QR Code indisponível
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Pix Copia e Cola
            </label>
            <div className="flex items-stretch gap-2">
              <textarea
                readOnly
                value={order.pix_qr_code || ""}
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-xs text-gray-700"
                rows={3}
              />
              <button
                type="button"
                onClick={copyPix}
                className="flex items-center gap-1 rounded-lg bg-green-700 px-3 text-sm font-bold text-white hover:bg-green-800"
              >
                <Copy size={16} />
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
            <Loader2 className="animate-spin" size={16} />
            Aguardando pagamento... a tela será atualizada automaticamente.
          </div>

          {order.pix_ticket_url && (
            <a
              href={order.pix_ticket_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block text-center text-sm text-green-700 underline"
            >
              Abrir página de pagamento
            </a>
          )}

          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="mt-4 w-full rounded-full border-2 border-green-700 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50"
          >
            Ver meus pedidos
          </button>
        </div>
      </div>
    );
  }

  // Tela de confirmação — usada para Pix confirmado e para os métodos
  // em modo demo (cartão/boleto), que são marcados como pagos direto.
  if (order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={80} />
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900">Pedido confirmado!</h1>
        <p className="mt-2 text-gray-600">
          Seu pedido <strong>#{order.id}</strong> foi {isPix ? "pago" : "recebido"} com sucesso.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Você receberá um e-mail com os detalhes da entrega. Rumo ao hexa! 🇧🇷
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => navigate("/orders")}
            className="rounded-full bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800"
          >
            Ver meus pedidos
          </button>
          <button
            onClick={() => navigate("/products")}
            className="rounded-full border-2 border-green-700 px-6 py-3 font-bold text-green-700 hover:bg-green-50"
          >
            Continuar comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold text-green-900">Finalizar compra</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Endereço de entrega</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome completo" value={name} onChange={setName} className="md:col-span-2" />
              <Field label="CEP" value={cep} onChange={setCep} placeholder="00000-000" />
              <Field label="Rua" value={street} onChange={setStreet} className="md:col-span-1" />
              <Field label="Número" value={number} onChange={setNumber} />
              <Field label="Cidade" value={city} onChange={setCity} />
              <Field label="Estado" value={state} onChange={setState} placeholder="SP" />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Forma de pagamento</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <PayOption
                selected={payment === "pix"}
                onClick={() => setPayment("pix")}
                title="Pix"
                desc="Pagamento instantâneo"
              />
              <PayOption
                selected={payment === "credit_card"}
                onClick={() => setPayment("credit_card")}
                title="Cartão"
                desc="Em até 10x"
              />
              <PayOption
                selected={payment === "boleto"}
                onClick={() => setPayment("boleto")}
                title="Boleto"
                desc="Vence em 3 dias"
              />
            </div>

            {payment === "credit_card" && (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Número do cartão"
                  value={cardNumber}
                  onChange={setCardNumber}
                  placeholder="0000 0000 0000 0000"
                  className="md:col-span-2"
                />
                <Field label="Nome impresso" value={cardName} onChange={setCardName} className="md:col-span-2" />
                <Field label="Validade" value={cardExp} onChange={setCardExp} placeholder="MM/AA" />
                <Field label="CVV" value={cardCvv} onChange={setCardCvv} placeholder="123" />
              </div>
            )}
            {payment === "pix" && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">
                Ao confirmar, geramos um QR Code Pix. Você paga pelo app do seu banco e a tela atualiza sozinha quando o pagamento cair.
              </div>
            )}
            {payment === "boleto" && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-900">
                O boleto será gerado após a confirmação do pedido e vence em 3 dias úteis.
              </div>
            )}
          </section>

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Resumo</h2>
          <ul className="space-y-2 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between text-gray-700">
                <span className="truncate pr-2">
                  {it.quantity}x {it.product.name} ({it.size})
                </span>
                <span className="whitespace-nowrap">
                  R$ {(it.product.price * it.quantity).toFixed(2).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
          <hr />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between">
              <span>Frete</span>
              <span>
                {shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-extrabold text-green-900">
              <span>Total</span>
              <span>R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400 py-3 font-extrabold text-green-900 shadow hover:bg-yellow-300 disabled:opacity-60"
          >
            <CreditCard size={18} />
            {loading ? "Processando..." : "Confirmar pedido"}
          </button>
          <p className="text-center text-xs text-gray-500">
            Pagamento 100% seguro. Pedido processado após confirmação.
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />
    </div>
  );
}

function PayOption({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition ${
        selected ? "border-green-700 bg-green-50" : "border-gray-200 bg-white hover:border-green-400"
      }`}
    >
      <div className="font-bold text-gray-900">{title}</div>
      <div className="text-xs text-gray-600">{desc}</div>
    </button>
  );
}
