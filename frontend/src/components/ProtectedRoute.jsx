import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children, requireAdmin = false }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    // pas connecté → login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // route admin mais user pas admin → renvoyé à l'accueil
    if (requireAdmin && user.role !== "admin") {
        return <Navigate to="/" replace />;
    }

    return children;
}