import { Link, useNavigate } from "react-router-dom";

export default function LoginForm() {
    const navigate = useNavigate()

    const handleLogin = () => {
        navigate("/register")
    }

    const label = "mb-1 block text-sm font-semibold text-slate-300";
    const input = "w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500";
    const button = "w-full rounded-lg border border-blue-800 bg-blue-800/20 p-2.5 text-white placeholder-slate-400 hover:bg-blue-800 hover:border-blue-800";

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
            <section className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
                <h1 className="mb-8 text-center text-4xl font-bold text-white">
                    Connexion
                </h1>

                <form className="space-y-5">
                    <div>
                        <label className={label}>Email</label>
                        <input className={input}
                            type="text"
                            placeholder="Email"></input>
                    </div>
                    <div>

                        <label className={label}>Lot de passe</label>
                        <input className={input}
                            type="password"
                            placeholder="********"></input>
                    </div>
                    <button className={button}
                        type="submit"
                        onSubmit={handleLogin}>Insrivez-vous</button>

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