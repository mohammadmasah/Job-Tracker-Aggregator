import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { IoMenu, IoClose } from "react-icons/io5";
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
                            <NavLink to="/settings/apparence" className={subLinkClass}>Apparence</NavLink>
                        </div>
                    )}
                </nav>

                <div className="mt-auto p-5 border-t border-border-soft flex justify-center min-w-60">
                    <Logo />
                </div>
            </aside>
        </>
    );
}