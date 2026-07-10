import { useState } from "react";
import { Link } from "react-router-dom";

export default function Connexion() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-200 flex items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
        <h1 className="mb-8 text-center text-5xl font-bold">
          Connexion
        </h1>

        <form className="space-y-7">
          <div>
            <label className="mb-2 block text-lg font-semibold text-slate-300">
              Email
            </label>

            <input
              type="email"
              placeholder="Entrez votre email"
              className="w-full rounded-lg border border-slate-500 bg-[#111827] px-4 py-3 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-slate-300">
              Mot de passe
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Entrez votre mot de passe"
                className="w-full rounded-lg border border-slate-500 bg-[#111827] px-4 py-3 pr-28 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-sky-400 hover:text-sky-300"
              >
                {showPassword ? "Cacher" : "Afficher"}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-7 py-3 text-lg font-bold text-white hover:bg-cyan-400"
            >
              Se connecter
            </button>
          </div>

          <p className="text-center text-sm text-slate-400">
            Pas encore inscrit ?{" "}
            <Link
              to="/"
              className="font-semibold text-sky-400 hover:text-cyan-300"
            >
              Créer un compte
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}