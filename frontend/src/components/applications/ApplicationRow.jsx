import {
    IoGlobeOutline,
    IoStar,
    IoStarOutline,
    IoTrashOutline,
} from "react-icons/io5";
import { STATUS_META, needsRelance, daysSince, RELANCE_COLOR } from "../../constants/status";

const TYPE_LABELS = { alternance: "Alternance", stage: "Stage", cdi: "CDI", cdd: "CDD" };

export default function ApplicationRow({ application, onDelete, onSelect, favorite, onToggleFavorite }) {
    const s = STATUS_META[application.status] || { label: application.status, color: "var(--text-3)" };
    const days = daysSince(application.applied_at);
    const relance = needsRelance(application);
    const accent = relance ? RELANCE_COLOR : s.color;

    return (
        <div
            onClick={onSelect}
            className="group flex items-center gap-4 bg-panel border border-border-soft rounded-[6px] pl-0 pr-3 py-2.5 cursor-pointer transition-colors hover:border-border hover:bg-card"
            style={{ borderLeftWidth: "4px", borderLeftColor: `${accent}90` }}
        >
            {/* Favori */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(application.id); }}
                className="shrink-0 ml-3 transition-colors"
                style={{ color: favorite ? "var(--c3)" : "var(--text-3)" }}
                title={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
                {favorite ? <IoStar className="text-[15px]" /> : <IoStarOutline className="text-[15px] hover:text-[var(--c3)]" />}
            </button>

            {/* Statut (pastille) */}
            <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} title={s.label} />

            {/* Entreprise + poste */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-text truncate">{application.company || "—"}</span>
                    {application.remote && (
                        <IoGlobeOutline className="text-[12px] shrink-0" style={{ color: "var(--accent)" }} title="Télétravail" />
                    )}
                    {relance && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] shrink-0" style={{ backgroundColor: `${RELANCE_COLOR}18`, color: RELANCE_COLOR }}>
                            Relance
                        </span>
                    )}
                </div>
                <span className="text-[11px] text-text-2 truncate block">{application.position || "—"}</span>
            </div>

            {/* Statut label (masqué sur petit écran) */}
            <span className="hidden md:block text-[11px] uppercase tracking-wide shrink-0 w-28 truncate" style={{ color: s.color }}>
                {s.label}
            </span>

            {/* Lieu */}
            <span className="hidden lg:block text-[11px] text-text-2 shrink-0 w-32 truncate">
                {application.remote ? "Remote" : application.location || "—"}
            </span>

            {/* Type */}
            <span className="hidden lg:block text-[11px] text-text-3 shrink-0 w-24 truncate uppercase">
                {TYPE_LABELS[application.type] || application.type}
            </span>

            {/* Salaire */}
            <span className="hidden xl:block text-[11px] shrink-0 w-24 truncate" style={{ color: application.salary ? "var(--c2)" : "var(--text-3)" }}>
                {application.salary || "—"}
            </span>

            {/* Date */}
            <span className="text-[10px] text-text-3 shrink-0 w-16 text-right">
                {days}j
            </span>

            {/* Supprimer */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(application.id); }}
                className="shrink-0 text-text-3 hover:text-[var(--c4)] opacity-0 group-hover:opacity-100 transition-all"
                title="Supprimer"
            >
                <IoTrashOutline className="text-[14px]" />
            </button>
        </div>
    );
}