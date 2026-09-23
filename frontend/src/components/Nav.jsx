import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { IoBriefcaseOutline, IoCloseOutline, IoDocumentTextOutline, IoGridOutline, IoMenuOutline, IoPeopleOutline, IoSettingsOutline } from "react-icons/io5";
import Logo from "./Logo";

export default function Nav() {
    const location = useLocation();
    const isSettings = location.pathname.startsWith("/settings");

    const [mobileOpen, setMobileOpen] = useState(false);
    const closeMobileNav = () => setMobileOpen(false);

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-[12px] transition-colors border-l-4 whitespace-nowrap ${isActive
            ? "text-accent bg-bg border-accent"
            : "text-text-2 hover:text-accent hover:bg-card border-transparent"
        }`;

    const subLinkClass = ({ isActive }) =>
        `pl-8 pr-4 py-2 text-[11px] transition-colors border-l whitespace-nowrap ${isActive
            ? "text-accent-2/70 bg-bg/40 border-accent-2/40"
            : "text-accent-2/30 hover:text-accent-2/70 hover:bg-bg/30 hover:border-accent-2/30 border-transparent"
        }`;

    const settingsParentClass = `flex items-center gap-3 px-4 py-2.5 text-[12px] transition-colors border-l-4 whitespace-nowrap ${isSettings
        ? "text-accent bg-bg border-accent"
        : "text-text-2 hover:text-accent hover:bg-card border-transparent"
        }`;

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
            <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-border-soft bg-panel/95 px-4 backdrop-blur md:hidden">
                {!mobileOpen && <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Ouvrir la navigation"
                    className="flex size-10 items-center justify-center rounded-[7px] border border-border-soft bg-card text-text shadow-sm transition-colors hover:border-accent hover:text-accent"
                >
                    <IoMenuOutline className="text-[21px]" />
                </button>}
                <div className="ml-3 flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-[5px] bg-accent text-[10px] font-extrabold text-white">JT</span>
                    <span className="text-xs font-extrabold tracking-wide text-text">Job Tracker &amp; Aggregator</span>
                </div>
            </div>

            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-text/20 backdrop-blur-[2px] md:hidden"
                    onClick={closeMobileNav}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-[min(19rem,calc(100vw-2.5rem))] flex-col overflow-hidden border-r border-border-soft bg-panel font-mono shadow-xl transition-transform duration-300 ease-out md:static md:w-64 md:translate-x-0 md:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex items-center gap-3 border-b border-border-soft bg-panel px-5 py-5">
                    <span className="flex size-9 items-center justify-center rounded-[6px] bg-accent text-[11px] font-extrabold text-white shadow-sm">JT</span>
                    <div className="min-w-0">
                        <p className="text-sm font-extrabold tracking-wide text-text">Job Tracker &amp; Aggregator</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-3">Career workspace</p>
                    </div>
                    <button type="button" onClick={closeMobileNav} aria-label="Fermer la navigation" className="ml-auto flex size-9 items-center justify-center rounded-[6px] text-text-2 transition-colors hover:bg-card hover:text-text md:hidden"><IoCloseOutline className="text-[20px]" /></button>
                </div>

                <nav className="flex flex-col gap-1 px-3 pt-6">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-3">Espace de travail</p>
                    <NavLink to="/" end className={linkClass} onClick={closeMobileNav}><IoGridOutline className="text-[16px]" />Tableau de bord</NavLink>
                    <NavLink to="/applications" className={linkClass} onClick={closeMobileNav}><IoBriefcaseOutline className="text-[16px]" />Candidatures</NavLink>
                    <NavLink to="/offers" className={linkClass} onClick={closeMobileNav}><IoDocumentTextOutline className="text-[16px]" />Offres</NavLink>
                    <NavLink to="/contacts" className={linkClass} onClick={closeMobileNav}><IoPeopleOutline className="text-[16px]" />Contacts</NavLink>

                    <div className="mt-5 border-t border-border-soft pt-4">
                        <NavLink to="/settings" end className={settingsParentClass} onClick={closeMobileNav}><IoSettingsOutline className="text-[16px]" />Paramètres</NavLink>
                    </div>
                    {isSettings && (
                        <div className="ml-7 flex flex-col border-l border-border-soft pb-1">
                            <NavLink to="/settings/statistiques" className={subLinkClass}>Statistiques</NavLink>
                            <NavLink to="/settings/notifications" className={subLinkClass}>Notifications</NavLink>
                        </div>
                    )}
                </nav>

               {/* ESPACE PERSONNEL — carte stylée */}
                <div className="mt-auto p-3">
                    <div className="bg-card border border-border-soft rounded-[6px] overflow-hidden shadow-sm">
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