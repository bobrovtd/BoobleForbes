import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export const RegisterPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"creator" | "respondent">("creator");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ name, email, password, role });
      navigate("/forms");
    } catch {
      setError("Не удалось зарегистрировать пользователя")
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
        <p className="badge mb-3">AI Forms</p>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">Регистрация</h1>
        <p className="mt-1 text-sm muted">Создайте аккаунт, чтобы работать с формами.</p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="label">Имя</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
            />
          </label>

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
              minLength={8}
              required
            />
          </label>

          <label className="block">
            <span className="label">Роль</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "creator" | "respondent")}
              className="field"
            >
              <option value="creator">creator</option>
              <option value="respondent">respondent</option>
            </select>
          </label>

          {error && <p className="notice-danger rounded-lg px-3 py-2 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-success w-full disabled:opacity-50"
          >
            {loading ? "Регистрация..." : "Создать аккаунт"}
          </button>
        </form>

        <p className="mt-4 text-sm muted">
          Уже есть аккаунт? <Link className="font-semibold text-[var(--primary)] underline" to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};
