import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-bg font-mono flex items-center justify-center px-6">
            <div className="flex flex-col items-center text-center gap-6">
                <span className="text-accent text-[11px] tracking-widest uppercase">
                    Erreur
                </span>

                <h1 className="font-extrabold text-7xl text-text tracking-tight">
                    404
                </h1>

                <p className="text-text-3 text-sm max-w-md">
                    La page que vous cherchez n'existe pas ou a été déplacée.
                </p>

                <Link
                    to="/"
                    className="px-5 py-2.5 text-[11px] font-bold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase rounded-[4px] transition-colors"
                >
                    Retour au tableau de bord
                </Link>
            </div>
        </div>
    );
}
