import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = (): JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-bg min-h-screen p-10 text-center muted">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
