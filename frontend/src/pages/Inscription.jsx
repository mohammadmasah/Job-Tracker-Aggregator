import { useState } from "react";
import { Link } from "react-router-dom";

export default function Inscription() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsDontMatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div>
            <label className="mb-2 block text-lg font-semibold text-slate-300">
              Confirmer le mot de passe
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirmez votre mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-lg border bg-[#111827] px-4 py-3 pr-28 text-slate-200 placeholder-slate-500 outline-none focus:ring-1 ${
                  passwordsDontMatch
                    ? "border-pink-500 focus:border-pink-500 focus:ring-pink-500"
                    : "border-slate-500 focus:border-cyan-400 focus:ring-cyan-400"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-sky-400 hover:text-sky-300"
              >
                {showPassword ? "Cacher" : "Afficher"}
              </button>
            </div>

            {passwordsDontMatch && (
              <p className="mt-2 text-sm text-pink-500">
                Les mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-7 py-3 text-lg font-bold text-white hover:bg-cyan-400"
            >
              S'inscrire
            </button>
          </div>

          <p className="text-center text-sm text-slate-400">
            Déjà inscrit ?{" "}
            <Link
              to="/connexion"
              className="font-semibold text-sky-400 hover:text-cyan-300"
            >
              Se connecter
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}