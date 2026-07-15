import { useStatCards } from "../hooks/useStatCards";

export default function StatCardsConfig() {
    const { isVisible, toggleCard, allCards } = useStatCards();

    return (
        <div className="font-mono border border-border-soft rounded-[6px] overflow-hidden">
            {allCards.map((card) => {
                const active = isVisible(card.key);
                return (
                    <button
                        key={card.key}
                        onClick={() => toggleCard(card.key)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border-soft last:border-b-0 hover:bg-card/50 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <div className={`text-[12px] ${active ? "text-text" : "text-text-2"}`}>
                                {card.label}
                            </div>
                            <div className="text-[10px] text-text-3 truncate">{card.desc}</div>
                        </div>

                        {/* Toggle switch */}
                        <span
                            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${active ? "bg-accent" : "bg-border"
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg transition-all ${active ? "left-[18px]" : "left-0.5"
                                    }`}
                            />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}