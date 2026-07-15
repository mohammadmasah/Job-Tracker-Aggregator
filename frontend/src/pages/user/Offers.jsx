import { useState, useEffect } from "react";

import { fetchOffers, scrapeOffers } from "../../api/offers"
import OfferCard from "../../components/OfferCard";

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


    const button = "w-full rounded-lg border border-blue-800 bg-blue-800/20 p-2.5 text-white placeholder-slate-400 hover:bg-blue-800 hover:border-blue-800";
    return (
        <div>

            {/* HEADER */}
            <div className="flex justify-between h-[100px] border-b border-border-soft items-center px-8">
                <div>
                    <h1 className="font-extrabold text-2xl uppercase text-text tracking-wide">Offres</h1>
                </div>

                <button
                    type="button"
                    className="px-5 py-2.5 text-[11px] font-bold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase rounded-[4px] transition-colors"
                        onClick={handleScraping}>SCRAPER + </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5 max-h-[85vh]  overflow-y-auto custom-scroll">
                {offers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} />
                ))}
            </div>
        </div>

    )
}