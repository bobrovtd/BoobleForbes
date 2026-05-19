import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";

export const NotFoundPage = (): JSX.Element => {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="panel p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">404</h1>
        <p className="mt-2 muted">Страница не найдена</p>
        <Link to="/forms" className="btn btn-primary mt-4">
          На главную
        </Link>
      </div>
    </div>
  );
};
