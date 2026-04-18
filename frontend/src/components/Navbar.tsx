import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors hover:text-yellow-300 ${isActive ? "text-yellow-300" : "text-white"}`;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-green-700 via-green-600 to-green-700 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-white">
          <span className="text-3xl">🇧🇷</span>
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-wide">HEXA STORE</div>
            <div className="text-xs font-medium text-yellow-300">Copa do Mundo 2026</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" className={linkClass} end>
            Início
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Produtos
          </NavLink>
          {user && (
            <NavLink to="/orders" className={linkClass}>
              Meus pedidos
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            to="/cart"
            className="relative rounded-full bg-yellow-400 p-2 text-green-900 transition hover:bg-yellow-300"
            aria-label="Carrinho"
          >
            <ShoppingCart size={22} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full bg-green-800 px-3 py-1.5 text-sm text-white">
                <User size={16} />
                {user.name.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-full border border-white/30 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-white/40 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-bold text-green-900 transition hover:bg-yellow-300"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/20 bg-green-700 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-white">
            <NavLink to="/" onClick={() => setOpen(false)} className={linkClass} end>
              Início
            </NavLink>
            <NavLink to="/products" onClick={() => setOpen(false)} className={linkClass}>
              Produtos
            </NavLink>
            <NavLink to="/cart" onClick={() => setOpen(false)} className={linkClass}>
              Carrinho ({itemCount})
            </NavLink>
            {user ? (
              <>
                <NavLink to="/orders" onClick={() => setOpen(false)} className={linkClass}>
                  Meus pedidos
                </NavLink>
                <span className="text-sm text-yellow-300">Olá, {user.name.split(" ")[0]}</span>
                <button onClick={handleLogout} className="text-left text-white hover:text-yellow-300">
                  Sair
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)} className={linkClass}>
                  Entrar
                </NavLink>
                <NavLink to="/register" onClick={() => setOpen(false)} className={linkClass}>
                  Cadastrar
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
