import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function LoginForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();            // empêche le rechargement de la page
        setError("");
        setLoading(true);
        try {
            await axios.post(
                "http://localhost:8000/api/user/login",   // adapte à ta vraie route
                { email, password },
                { withCredentials: true }                    // reçoit le cookie HttpOnly
            );
            // connexion OK → va vers la page demandée, ou l'accueil
            const dest = location.state?.from?.pathname || "/";
            navigate(dest, { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.detail || "Email ou mot de passe incorrect."
            );
        } finally {
            setLoading(false);
        }
    };

    const label = "mb-1 block text-sm font-semibold text-slate-300";
    const input = "w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500";
    const button = "w-full rounded-lg border border-blue-800 bg-blue-800/20 p-2.5 text-white hover:bg-blue-800 hover:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
            <section className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
                <h1 className="mb-8 text-center text-4xl font-bold text-white">
                    Connexion
                </h1>

                <form className="space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label className={label}>Email</label>
                        <input
                            className={input}
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className={label}>Mot de passe</label>
                        <input
                            className={input}
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    <button className={button} type="submit" disabled={loading}>
                        {loading ? "Connexion..." : "Se connecter"}
                    </button>

                    <p className="text-sm text-slate-400 pt-2">
                        Pas encore de compte?{" "}
                        <Link to="/register" className="text-blue-500 hover:underline">
                            Inscription
                        </Link>
                    </p>
                </form>
            </section>
        </div>
    );
}