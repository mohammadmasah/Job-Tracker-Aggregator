import { useState, useEffect } from "react";
import { fetchOffers } from "../../src/api/offers";
import OffersBySource from "./OffersBySource";

// Vue "Par source" — s'affiche dans l'<Outlet> de OffersLayout, sur /offers
export default function OffersBySourceView() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchOffers();
                setOffers(res.data);
            } catch (e) {
                console.error("Erreur chargement offres", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    return (
        <div className="h-full overflow-y-auto custom-scroll">
            <OffersBySource offers={offers} />
        </div>
    );
}