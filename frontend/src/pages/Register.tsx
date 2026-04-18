import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate(redirect);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Não foi possível criar a conta";
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
          <h1 className="mt-2 text-2xl font-extrabold text-green-900">Criar conta</h1>
          <p className="text-sm text-gray-600">Junte-se à torcida rumo ao hexa!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Nome completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="João Silva"
            />
          </div>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="mínimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-yellow-400 py-3 font-extrabold text-green-900 transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link
            to={`/login${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
            className="font-bold text-green-700 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
