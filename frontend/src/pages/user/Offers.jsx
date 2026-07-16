import { useState, useEffect } from "react";
import OffersList from "../../components/offers/OffersList";
import { fetchOffers, scrapeOffers } from "../../api/offers";
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
            await scrapeOffers();
            await loadOffers();
        } catch (e) {
            console.error("Erreur scraping", e);
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
            {/* HEADER — aligné avec le reste du site */}
            <div className="flex items-center justify-between px-8 h-[100px] border-b border-border-soft shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase text-text tracking-wide">Offres</h1>
                    <p className="text-[11px] text-text-3 mt-1">{offers.length} au total</p>
                </div>

                <button
                    onClick={handleScraping}
                    disabled={scraping}
                    className="flex items-center gap-2 text-[11px] text-bg bg-accent hover:bg-accent-2 px-5 py-2.5 rounded-[4px] tracking-wider uppercase transition-colors font-bold disabled:opacity-70"
                >
                    <IoRefreshOutline className={`text-[15px] ${scraping ? "animate-spin" : ""}`} />
                    {scraping ? "Actualisation..." : "Actualiser"}
                </button>
            </div>

            {/* MAÎTRE-DÉTAIL */}
            <div className="flex-1 min-h-0">
                <OffersList offers={offers} />
            </div>
        </div>
    );
}