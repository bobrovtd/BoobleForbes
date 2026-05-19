import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("creator@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate("/forms");
    } catch {
      setError("Проверьте email или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="panel w-full max-w-md p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="badge mb-3">AI Forms</p>
            <h1 className="font-display text-2xl font-bold text-[var(--text)]">Вход в AI Forms</h1>
            <p className="mt-1 text-sm muted">Войдите, чтобы создавать и заполнять формы.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              required
            />
          </label>

          <label className="block">
            <span className="label">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              required
            />
          </label>

          {error && <p className="notice-danger rounded-lg px-3 py-2 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-4 text-sm muted">
          Нет аккаунта? <Link className="font-semibold text-[var(--primary)] underline" to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};
