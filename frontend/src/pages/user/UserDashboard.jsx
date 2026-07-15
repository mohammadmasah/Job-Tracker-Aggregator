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

            <div className="grid grid-cols-3">
                {offers.map((offer) => (
                    <div className="flex flex-col m-5 border p-5 gap-5"
                        key={offer.id}>
                        <h2>{offer.title}</h2>
                        <p>{offer.company}</p>
                        <span>{offer.description}</span>
                        <span>{offer.descriptionPreview}</span>
                        <span>{offer.localisation}</span>
                        <span>{offer.createdAt}</span>
                        <span>{offer.start}</span>
                        <span>{offer.sectors}</span>
                        <span>{offer.skills}</span>
                        <span>{offer.salary_currency}</span>
                        <span>{offer.salary_min}</span>
                        <span>{offer.salary_max}</span>

                    </div>
                ))}
            </div>
        </div>

    )
}