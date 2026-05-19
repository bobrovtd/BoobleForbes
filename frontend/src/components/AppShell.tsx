import { Link, Outlet, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export const AppShell = (): JSX.Element => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async (): Promise<void> => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/forms" className="flex items-center gap-3 font-display text-xl font-bold tracking-tight text-[var(--text)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm text-white shadow-sm">
              AI
            </span>
            <span>Forms</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="badge hidden md:inline-flex">{user?.email}</span>
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-secondary h-10 px-3"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};
