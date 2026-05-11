import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = (): JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-10 text-center text-slate-600">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
