import {
    IoBriefcaseOutline,
    IoPeopleOutline,
    IoTrendingUpOutline,
    IoCalendarOutline,
    IoAlarmOutline,
    IoSpeedometerOutline,
    IoArrowUpOutline,
    IoArrowDownOutline,
    IoRemoveOutline,
} from "react-icons/io5";
import { useStats } from "../../hooks/useStats";
import { useStatCards } from "../../hooks/useStatCards";

const ICONS = {
    IoBriefcaseOutline,
    IoPeopleOutline,
    IoTrendingUpOutline,
    IoCalendarOutline,
    IoAlarmOutline,
    IoSpeedometerOutline,
};

// Indicateur de tendance "cette semaine" (hausse/baisse/stable)
function TrendBadge({ trend }) {
    if (!trend) return null;
    const { color, Icon } = {
        up:   { color: "var(--c2)", Icon: IoArrowUpOutline },
        down: { color: "var(--c4)", Icon: IoArrowDownOutline },
        flat: { color: "var(--text-3)", Icon: IoRemoveOutline },
    }[trend.direction || "flat"];
    return (
        <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px]"
            style={{ color, backgroundColor: `${color}1a` }}
            title="Évolution cette semaine"
        >
            <Icon className="text-[11px]" />
            {trend.label}
        </span>
    );
}

export default function StatsCards({ applications = [], contacts = [] }) {
    const stats = useStats(applications, contacts);
    const { visible, allCards } = useStatCards();

    const cards = allCards.filter((c) => visible.includes(c.key));

    if (cards.length === 0) {
        return (
            <p className="text-[11px] text-text-3 font-mono">
                Aucune carte activée. Active des statistiques dans les Paramètres.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {cards.map((card) => {
                const Icon = ICONS[card.icon];
                const value = stats[card.key];
                // tendance : depuis le hook (stats.<key>_trend) sinon fallback carte
                const trend = stats[`${card.key}_trend`] || card.trend || null;

                return (
                    <div
                        key={card.key}
                        className="bg-panel border border-border-soft rounded-[10px] p-6 min-h-[160px] flex flex-col justify-between hover:border-border transition-colors"
                    >
                        {/* Haut : icône + badge tendance */}
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-[8px] bg-card border border-border-soft flex items-center justify-center text-accent text-[18px]">
                                {Icon && <Icon />}
                            </div>
                            <TrendBadge trend={trend} />
                        </div>

                        {/* Bas : valeur + label */}
                        <div>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-[34px] font-bold text-text leading-none tabular-nums">
                                    {value}
                                </span>
                                {card.suffix && (
                                    <span className="text-[15px] font-semibold text-text-3">{card.suffix}</span>
                                )}
                            </div>
                            <div className="text-[10px] text-text-3 uppercase tracking-wider mt-2">
                                {card.label}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}