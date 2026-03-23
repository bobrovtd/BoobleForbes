import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { FormBuilderPage } from "@/pages/FormBuilderPage";
import { FormsPage } from "@/pages/FormsPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PublicFormPage } from "@/pages/PublicFormPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ResponsesPage } from "@/pages/ResponsesPage";

const HomeRedirect = (): JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-600">????????...</div>;
  }

  return <Navigate to={user ? "/forms" : "/login"} replace />;
};

const App = (): JSX.Element => {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/new" element={<FormBuilderPage />} />
          <Route path="/forms/:id/edit" element={<FormBuilderPage />} />
          <Route path="/forms/:id/responses" element={<ResponsesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
