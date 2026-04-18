import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Truck, ShieldCheck, Trophy } from "lucide-react";
import api, { Product } from "../api";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.get<Product[]>("/products").then((res) => setProducts(res.data));
  }, []);

  const featured = products.filter((p) => p.featured === 1).slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-yellow-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0%, transparent 50%)" }} />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="mb-4 inline-block rounded-full bg-yellow-400 px-4 py-1 text-sm font-bold text-green-900">
              COPA DO MUNDO 2026
            </span>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              Vista o manto <span className="text-yellow-300">verde-amarelo</span> rumo ao HEXA
            </h1>
            <p className="mt-4 max-w-md text-lg text-green-50">
              A camisa oficial da Seleção Brasileira para a Copa do Mundo 2026 já está disponível.
              Torça com orgulho. Vibra com o Brasil.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="rounded-full bg-yellow-400 px-6 py-3 font-bold text-green-900 shadow-lg transition hover:bg-yellow-300"
              >
                Comprar camisa Brasil
              </Link>
              <Link
                to="/products"
                className="rounded-full border-2 border-white px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Ver catálogo completo
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-300 text-yellow-300" />
                <Star size={16} className="fill-yellow-300 text-yellow-300" />
                <Star size={16} className="fill-yellow-300 text-yellow-300" />
                <Star size={16} className="fill-yellow-300 text-yellow-300" />
                <Star size={16} className="fill-yellow-300 text-yellow-300" />
                <span className="ml-2">4.9 · +12.800 torcedores</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=900&q=80"
              alt="Camisa do Brasil"
              className="rounded-3xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/900x700/16a34a/fbbf24?text=Brasil+2026";
              }}
            />
            <div className="absolute -bottom-4 -left-4 rotate-[-6deg] rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-xl">
              ⭐ 6 ESTRELAS
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Benefit icon={<Truck size={24} />} title="Frete grátis" desc="Acima de R$ 299" />
          <Benefit icon={<ShieldCheck size={24} />} title="Produto oficial" desc="100% autêntico" />
          <Benefit icon={<Trophy size={24} />} title="Edição Copa 2026" desc="Limitada" />
          <Benefit icon={<Star size={24} />} title="Parcelado" desc="Em até 10x" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-green-900">Destaques da Copa</h2>
            <p className="text-gray-600">As camisas mais cobiçadas pelos torcedores brasileiros</p>
          </div>
          <Link to="/products" className="hidden text-sm font-bold text-green-700 hover:underline md:block">
            Ver todos os produtos →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="bg-yellow-400 py-12 text-green-900">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            De Norte a Sul, todo o Brasil vestindo a amarelinha
          </h2>
          <p className="mx-auto mt-2 max-w-2xl">
            Junte-se a milhares de torcedores que já garantiram sua camisa oficial para a Copa 2026.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-full bg-green-700 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-green-800"
          >
            Quero minha camisa
          </Link>
        </div>
      </section>
    </div>
  );
}

function Benefit({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="rounded-full bg-green-100 p-3 text-green-700">{icon}</div>
      <div>
        <div className="font-bold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
    </div>
  );
}
