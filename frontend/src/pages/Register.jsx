import { Link } from "react-router-dom";

export default function Register() {

    const input = "placeholder:text-text-3/50 w-full text-text/80 bg-emerald-900 border border-border-soft rounded-[4px] px-3 py-2 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent transition-colors font-mono";

    return (
        <div>
            <main className="min-h-screen bg-[#0b0f19] text-slate-200 flex items-center justify-center px-6">
                <section className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
                    <h1 className="mb-8 text-center text-5xl font-bold">
                        Inscription
                    </h1>

                    <form className="space-y-7">
                        <div>
                            <label className="mb-2 block text-lg font-semibold text-slate-300">
                                Prénom et Nom
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez votre prénom et votre nom"
                                className="w-full rounded-lg border border-slate-500 bg-[#111827] px-4 py-3 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-lg font-semibold text-slate-300">
                                Email
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez votre email"
                                className="w-full rounded-lg border border-slate-500 bg-[#111827] px-4 py-3 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-lg font-semibold text-slate-300">
                                Mot de passe
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez votre mot de passe"
                                className="w-full rounded-lg border border-slate-500 bg-[#111827] px-4 py-3 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="rounded-lg bg-sky-500 px-7 py-3 text-lg font-bold text-white hover:bg-sky-400"
                            >
                                S'inscrire
                            </button>
                        </div>
                        <p>Déjà inscrit?  <Link to="/login"
                        className="text-blue-600">Connexion</Link></p>
                    </form>
                </section>
            </main>
        </div>
    )
}