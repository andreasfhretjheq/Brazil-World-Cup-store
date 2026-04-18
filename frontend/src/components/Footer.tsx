import { Instagram, Twitter, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 bg-green-900 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇧🇷</span>
            <span className="text-lg font-extrabold">HEXA STORE</span>
          </div>
          <p className="mt-3 text-sm text-green-100">
            A loja oficial do torcedor brasileiro para a Copa do Mundo 2026. Vem pro hexa!
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-yellow-300">Institucional</h3>
          <ul className="space-y-2 text-sm text-green-100">
            <li>Sobre nós</li>
            <li>Política de privacidade</li>
            <li>Trocas e devoluções</li>
            <li>Fale conosco</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-yellow-300">Atendimento</h3>
          <ul className="space-y-2 text-sm text-green-100">
            <li>WhatsApp: (11) 9 9999-2026</li>
            <li>Seg-Sex 9h às 18h</li>
            <li>Sáb 9h às 14h</li>
            <li>sac@hexastore.com.br</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-yellow-300">Siga-nos</h3>
          <div className="flex gap-3">
            <Instagram className="cursor-pointer hover:text-yellow-300" />
            <Twitter className="cursor-pointer hover:text-yellow-300" />
            <Facebook className="cursor-pointer hover:text-yellow-300" />
            <Youtube className="cursor-pointer hover:text-yellow-300" />
          </div>
          <p className="mt-4 text-xs text-green-200">
            Pagamento seguro · Pix · Cartão · Boleto
          </p>
        </div>
      </div>
      <div className="border-t border-green-700 py-4 text-center text-xs text-green-200">
        © 2026 Hexa Store · Todos os direitos reservados · Esta é uma loja fictícia para demonstração
      </div>
    </footer>
  );
}
