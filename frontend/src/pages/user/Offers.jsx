import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { fetchOffers, scrapeOffers } from "../../api/offers"
import OffersBySource from "../../components/OffersBySource";

export default function Offers() {
    const [offers, setOffers] = useState([]);

    const loadOffers = async () => {
        const res = await fetchOffers();
        setOffers(res.data)
    }

    const handleScraping = async () => {
        await scrapeOffers();
        await loadOffers();
    }

    useEffect(() => {
        loadOffers();
    }, [])

    const navigate = useNavigate()
    const button = "px-5 py-2.5 text-[11px] font-bold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase rounded-[4px] transition-colors"
    return (
        <div>

            {/* HEADER */}
            <div className="flex justify-between h-[100px] border-b border-border-soft items-center px-8">
                <div>
                    <h1 className="font-extrabold text-2xl uppercase text-text tracking-wide">Offres</h1>
                </div>

                <button
                    type="button"
                    className={button}
                    onClick={() => navigate("/offers/all")}>Toutes les Offres</button>
                <button
                    type="button"
                    className={button}
                    onClick={handleScraping}>SCRAPER + </button>
            </div>

            <div className="max-h-[85vh] overflow-y-auto custom-scroll">
                <OffersBySource offers={offers} />
            </div>
        </div>

    )
}