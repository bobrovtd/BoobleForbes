import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
      setError("?? ??????? ???????????????? ????????????")
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grain bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-ink">???????????</h1>
        <p className="mt-1 text-sm text-slate-600">???????? ??????? ?????? ??? ?????? ? ???????.</p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">???</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">??????</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              minLength={8}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">????</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "creator" | "respondent")}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="creator">creator</option>
              <option value="respondent">respondent</option>
            </select>
          </label>

          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? "????????..." : "??????? ???????"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          ??? ???? ???????? <Link className="text-sky-700 underline" to="/login">?????</Link>
        </p>
      </div>
    </div>
  );
};
