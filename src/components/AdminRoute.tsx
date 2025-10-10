import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AdminRouteProps = {
  children: JSX.Element;
};

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <p>Chargement...</p>; // ou un spinner
  }

  if (!user || role !== "admin") {
    return <Navigate to="/" replace />; // redirige si pas admin
  }

  return children;
}
