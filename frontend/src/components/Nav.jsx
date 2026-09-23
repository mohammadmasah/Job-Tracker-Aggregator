import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { IoMenu, IoNotificationsOutline } from "react-icons/io5";
import Logo from "./Logo";
import TodayDate from "./TodayDate";

export default function Nav() {
    const location = useLocation();
    const isSettings = location.pathname.startsWith("/settings");
    const isOffers = location.pathname.startsWith("/offers")

    // Ouverte par défaut sur desktop ; l'état est persisté
    const [open, setOpen] = useState(() => localStorage.getItem("nav-open") !== "0");
    const toggle = () => {
        setOpen((v) => {
            const next = !v;
            localStorage.setItem("nav-open", next ? "1" : "0");
            return next;
        });
    };
    const close = () => { setOpen(false); localStorage.setItem("nav-open", "0"); };

    const linkClass = ({ isActive }) =>
        `px-4 py-2.5 text-[12px] transition-colors border-l-4 whitespace-nowrap ${isActive
            ? "text-accent bg-bg border-accent/70"
            : "text-text-2 hover:text-accent/70 hover:bg-card/50 border-transparent"
        }`;

    const subLinkClass = ({ isActive }) =>
        `pl-8 pr-4 py-2 text-[11px] transition-colors border-l whitespace-nowrap ${isActive
            ? "text-accent-2/70 bg-bg/40 border-accent-2/40"
            : "text-accent-2/30 hover:text-accent-2/70 hover:bg-bg/30 hover:border-accent-2/30 border-transparent"
        }`;

    const settingsParentClass = `px-4 py-2.5 text-[12px] transition-colors border-l-4 whitespace-nowrap ${isSettings
        ? "text-accent bg-bg border-accent/70"
        : "text-text-2 hover:text-accent/70 hover:bg-card/50 border-transparent"
        }`;

    const offersParentClass = `px-4 py-2.5 text-[12px] transition-colors border-l-4 whitespace-nowrap ${isOffers
        ? "text-accent bg-bg border-accent/70"
        : "text-text-2 hover:text-accent/70 hover:bg-card/50 border-transparent"
        }`;


    const navigate = useNavigate();

    // Placeholders (à brancher plus tard)
    const user = { name: "Dawid", email: "dawid@trackit.app" };
    const toFollowUp = 0;        // nb à relancer → pastille si > 0
    const notifCount = 0;        // nb notifications
    const initial = user.name.charAt(0).toUpperCase();

    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            await fetch("http://localhost:8000/api/documents", {
                method: "POST", body: formData, credentials: "include",
            });
        } catch (err) {
            console.error("Échec de l'upload", err);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    return (
        <>
            {/* Bouton toggle — fixe, en haut à gauche */}
            <button
                onClick={toggle}
                aria-label={open ? "Masquer le menu" : "Afficher le menu"}
                title={open ? "Masquer le menu" : "Afficher le menu"}
                className="fixed top-2 left-1 z-50 w-5 h-5 flex items-center justify-center text-text-2 hover:text-accent hover:border-accent shadow-md transition-colors"
            >
                {open ? <IoMenu className="text-[18px]" /> : <IoMenu className="text-[18px]" />}
            </button>

            {/* Fond sombre (mobile uniquement, quand ouvert) */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 bg-bg/70 z-30"
                    onClick={close}
                />
            )}

            {/* Barre latérale */}
            <aside
                className={`fixed md:static top-0 left-0 h-screen z-40 border-r border-border-soft bg-panel flex flex-col font-mono overflow-hidden
                    transition-[width,transform] duration-300 ease-in-out
                    ${open ? "w-60 translate-x-0" : "w-60 -translate-x-full md:w-0 md:translate-x-0 md:border-r-0"}`}
            >
                <div className="flex justify-center items-center bg-bg border-b border-border h-[100px] min-w-60">
                    <TodayDate />
                </div>

                <nav className="flex flex-col mt-8 min-w-60">
                    <NavLink to="/" end className={linkClass}>Tableau de bord</NavLink>
                    <NavLink to="/applications" className={linkClass}>Candidatures</NavLink>
                    <NavLink to="/offers" className={linkClass}>Offres</NavLink>
                    <NavLink to="/contacts" className={linkClass}>Contacts</NavLink>

                    <NavLink to="/settings" end className={settingsParentClass}>Paramètres</NavLink>
                    {isSettings && (
                        <div className="flex flex-col border-b border-border-soft pb-1">
                            <NavLink to="/settings/statistiques" className={subLinkClass}>Statistiques</NavLink>
                            <NavLink to="/settings/notifications" className={subLinkClass}>Notifications</NavLink>
                        </div>
                    )}
                </nav>

               {/* ESPACE PERSONNEL — carte stylée */}
                <div className="mt-auto min-w-60 p-3">
                    <div className="bg-card border border-border-soft rounded-[8px] overflow-hidden">

                        {/* Ligne profil */}
                        <div className="flex items-center gap-2.5 p-3 border-b border-border-soft/60">
                            {/* Profil cliquable */}
                            <button
                                onClick={() => navigate("/profile")}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
                                title="Mon profil"
                            >
                                <div className="relative shrink-0">
                                    <div className="w-9 h-9 rounded-[8px] bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/40 flex items-center justify-center text-accent text-[13px] font-bold shadow-[0_0_12px_-4px] shadow-accent/40">
                                        {initial}
                                    </div>
                                    {toFollowUp > 0 && (
                                        <span
                                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-card animate-pulse"
                                            style={{ backgroundColor: "var(--c3)" }}
                                            title={`${toFollowUp} à relancer`}
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[12.5px] font-semibold text-text truncate group-hover:text-accent transition-colors leading-tight">
                                        {user.name}
                                    </div>
                                    <div className="text-[10px] text-text-3 truncate leading-tight mt-0.5 font-mono">
                                        {user.email}
                                    </div>
                                </div>
                            </button>

                            {/* Cloche notifications */}
                            <button
                                className="relative shrink-0 w-8 h-8 rounded-[6px] flex items-center justify-center text-text-2 hover:text-accent hover:bg-bg/60 transition-colors"
                                title="Notifications"
                            >
                                <IoNotificationsOutline className="text-[17px]" />
                                {notifCount > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-accent text-bg text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-card">
                                        {notifCount > 9 ? "9+" : notifCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Zone d'upload */}
                        <label className="group cursor-pointer flex items-center gap-2.5 px-3 py-2.5 hover:bg-bg/40 transition-colors">
                            <span className="w-7 h-7 rounded-[6px] border border-dashed border-border group-hover:border-accent flex items-center justify-center text-text-3 group-hover:text-accent transition-colors text-[14px] shrink-0">
                                {uploading ? "…" : "↑"}
                            </span>
                            <span className="text-[11px] text-text-2 group-hover:text-text transition-colors font-mono truncate">
                                {uploading ? "Envoi en cours…" : "Téléverser un document"}
                            </span>
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>

                    {/* Logo */}
                    <div className="pt-3 flex justify-center">
                        <Logo />
                    </div>
                </div>

            </aside>
        </>
    );
}