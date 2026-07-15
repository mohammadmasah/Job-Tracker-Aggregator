import { useMemo, useState } from "react";
import OfferCard from "./OfferCard";

// Libellés jolis par source (optionnel — sinon on affiche la clé brute)
const SOURCE_LABELS = {
    welovedevs: "We Love Devs",
    adzuna: "Adzuna",
    francetravail: "France Travail",
};

export default function OffersBySource({ offers, onDismiss }) {
    // Offres déjà vues (persistées) — un Set d'ids
    const [seen, setSeen] = useState(() => {
        const saved = localStorage.getItem("seen-offers");
        return new Set(saved ? JSON.parse(saved) : []);
    });

    const markSeen = (id) => {
        setSeen((prev) => {
            const next = new Set(prev);
            next.add(id);
            localStorage.setItem("seen-offers", JSON.stringify([...next]));
            return next;
        });
        onDismiss?.(id);
    };

    // Regroupe les offres NON vues par source (automatique)
    const grouped = useMemo(() => {
        const groups = {};
        for (const offer of offers) {
            if (seen.has(offer.id)) continue;          // masque les offres vues
            const src = offer.source || "autre";
            if (!groups[src]) groups[src] = [];
            groups[src].push(offer);
        }
        return groups;
    }, [offers, seen]);

    const sources = Object.keys(grouped);

    if (sources.length === 0) {
        return (
            <p className="text-text-3 text-[12px] font-mono p-8 text-center">
                Aucune nouvelle offre. Tout a été vu !
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-5 font-mono">
            {sources.map((src) => (
                <section key={src}>
                    {/* En-tête de section */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
                        <h2 className="text-[13px] font-bold uppercase tracking-wider text-accent">
                            {SOURCE_LABELS[src] || src}
                        </h2>
                        <span className="text-[11px] text-text-3">{grouped[src].length}</span>
                    </div>

                    {/* Scroll horizontal — ~4 cartes visibles */}
                    <div className="flex gap-4 overflow-x-auto custom-scroll pb-2">
                        {grouped[src].map((offer) => (
                            <div
                                key={offer.id}
                                onClick={() => markSeen(offer.id)}
                                className="shrink-0 w-[calc(25%-12px)] min-w-[260px] cursor-pointer"
                                title="Cliquer pour marquer comme vue"
                            >
                                <OfferCard offer={offer} />
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}   