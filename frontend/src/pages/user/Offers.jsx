import { useState, useEffect } from "react";
import OffersList from "../../components/offers/OffersList";
import PageHeader from "../../components/layout/PageHeader";
import { fetchOffers, scrapeOffers, fetchAzduna } from "../../api/offers";
import { IoRefreshOutline } from "react-icons/io5";


export default function Offers() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scraping, setScraping] = useState(false);

    const loadOffers = async () => {
        setLoading(true);
        try {
            const res = await fetchOffers();
            setOffers(res.data);
        } catch (e) {
            console.error("Erreur chargement offres", e);
        } finally {
            setLoading(false);
        }
    };

    const handleScraping = async () => {
        setScraping(true);
        try {
            console.log("Début du scraping WeLoveDevs...");
            try {
                await scrapeOffers();
            } catch (err) {
                console.error("Échec du scraper WeLoveDevs, mais on continue...", err);
            }

            console.log("Début du scraping Adzuna...");
            try {
                await fetchAzduna("developer", 1);
            } catch (err) {
                console.error("Échec du scraper Adzuna...", err);
            }

            // Une fois les deux exécutés l'un après l'autre, on recharge la liste unique
            console.log("Rechargement de toutes les offres...");
            await loadOffers();

        } catch (e) {
            console.error("Erreur critique globale lors de l'actualisation", e);
        } finally {
            setScraping(false);
        }
    };
    
    useEffect(() => {
        loadOffers();
    }, []);

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    return (
        <div className="h-full bg-bg font-mono flex flex-col pb-10">
            <PageHeader
                title="Offres"
                description={`${offers.length} opportunité${offers.length > 1 ? "s" : ""} disponible${offers.length > 1 ? "s" : ""}.`}
                actions={<button
                    onClick={handleScraping}
                    disabled={scraping}
                    className="flex min-h-10 items-center gap-2 rounded-[5px] bg-accent px-4 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-2 disabled:opacity-70"
                >
                    <IoRefreshOutline className={`text-[15px] ${scraping ? "animate-spin" : ""}`} />
                    {scraping ? "Actualisation..." : "Actualiser"}
                </button>}
            />

            {/* MAÎTRE-DÉTAIL */}
            <div className="flex-1 min-h-0">
                <OffersList offers={offers} />
            </div>
        </div>
    );
}