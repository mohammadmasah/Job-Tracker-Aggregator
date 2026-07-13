import { useState, useEffect } from "react";

import { fetchOffers, scrapeOffers } from "../../api/offers"

export default function UserDashboard() {
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
            <div className="border-b m-5 flex">
                <h1>USER</h1>
                <button
                type="button"
                    className={button}
                    onClick={handleScraping}>SCRAPER + </button>
            </div>

            <ul>
                {offers.map((offer) => (
                    <li key={offer.id}>{offer.company}</li>
                ))}
            </ul>
        </div>

    )
}