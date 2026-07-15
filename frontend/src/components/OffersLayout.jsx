import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { fetchOffers, scrapeOffers } from "../../src/api/offers";

// Layout des offres — même principe que SettingsLayout :
// header + sous-onglets de navigation + <Outlet /> pour la vue choisie.
export default function OffersLayout() {
    const [scraping, setScraping] = useState(false);

    const handleScraping = async () => {
        setScraping(true);
        try {
            await scrapeOffers();
            // Recharge la page courante pour voir les nouvelles offres
            window.location.reload();
        } finally {
            setScraping(false);
        }
    };

    const tab = ({ isActive }) =>
        `px-4 py-2 text-[12px] transition-colors border-b-2 whitespace-nowrap ${isActive
            ? "text-accent bg-bg border-accent/70"
            : "text-text-2 hover:text-accent/70 hover:bg-card/50 border-transparent"
        }`;

    const button = "px-5 py-2.5 text-[11px] font-bold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase rounded-[4px] transition-colors disabled:opacity-50";

    return (
        <div className="h-full bg-bg font-mono flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between h-[100px] border-b border-border-soft items-center px-8 shrink-0">
                <h1 className="font-extrabold text-2xl uppercase text-text tracking-wide">Offres</h1>
                <button type="button" className={button} onClick={handleScraping} disabled={scraping}>
                    {scraping ? "Scraping..." : "Scraper +"}
                </button>
            </div>

            {/* SOUS-ONGLETS — comme les sous-liens de Settings */}
            <div className="flex items-center gap-1 px-8 border-b border-border-soft shrink-0">
                <NavLink to="/offers" end className={tab}>Toutes les offres</NavLink>
                <NavLink to="/offers/source" end className={tab}>Par source</NavLink>
            </div>

            {/* VUE CHOISIE */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <Outlet />
            </div>
        </div>
    );
}