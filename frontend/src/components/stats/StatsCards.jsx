import {
    IoBriefcaseOutline,
    IoPeopleOutline,
    IoTrendingUpOutline,
    IoCalendarOutline,
    IoAlarmOutline,
    IoSpeedometerOutline,
} from "react-icons/io5";
import { useStats } from "../../hooks/useStats";
import { useStatCards } from "../../hooks/useStatCards";

// map nom -> composant icône
const ICONS = {
    IoBriefcaseOutline,
    IoPeopleOutline,
    IoTrendingUpOutline,
    IoCalendarOutline,
    IoAlarmOutline,
    IoSpeedometerOutline,
};

export default function StatsCards({ applications = [], contacts = [] }) {
    const stats = useStats(applications, contacts);
    const { visible, allCards } = useStatCards();

    // cartes à afficher, dans l'ordre de définition
    const cards = allCards.filter((c) => visible.includes(c.key));

    if (cards.length === 0) {
        return (
            <p className="text-[11px] text-text-3 font-mono">
                Aucune carte activée. Active des statistiques dans les Paramètres.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            {cards.map((card) => {
                const Icon = ICONS[card.icon];
                const value = stats[card.key];
                const display = card.suffix ? `${value}${card.suffix}` : value;

                return (
                    <div
                        key={card.key}
                        className="bg-panel border border-accent/15 rounded-[6px] p-4 hover:border-border transition-colors"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-[5px]  border border-accent/30   flex items-center justify-center text-accent text-[15px]">
                                {Icon && <Icon />}
                            </div>
                        </div>
                        <div className="text-[26px] font-bold text-accent-2 leading-none tabular-nums">
                            {display}
                        </div>
                        <div className="text-[10px] text-text-3 uppercase tracking-wide mt-1.5">
                            {card.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}