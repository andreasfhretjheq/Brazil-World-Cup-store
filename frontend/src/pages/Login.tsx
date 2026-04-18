import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Não foi possível entrar";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-4xl">🇧🇷</div>
          <h1 className="mt-2 text-2xl font-extrabold text-green-900">Entrar na Hexa Store</h1>
          <p className="text-sm text-gray-600">Bem-vindo de volta, torcedor!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-green-700 py-3 font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Ainda não tem conta?{" "}
          <Link
            to={`/register${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
            className="font-bold text-green-700 hover:underline"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
