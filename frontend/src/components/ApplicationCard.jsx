import {
    IoLocationOutline,
    IoGlobeOutline,
    IoWalletOutline,
    IoBusinessOutline,
    IoBriefcaseOutline,
    IoTimeOutline,
    IoStar,
    IoStarOutline,
} from "react-icons/io5";
import { STATUS_META, needsRelance, daysSince, RELANCE_COLOR } from "../constants/status";

const TYPE_LABELS = { alternance: "Alternance", stage: "Stage", cdi: "CDI", cdd: "CDD" };

export default function ApplicationCard({ application, onDelete, onSelect, favorite, onToggleFavorite }) {
    const s = STATUS_META[application.status] || { label: application.status, color: "var(--text-3)" };
    const days = daysSince(application.applied_at);
    const relance = needsRelance(application);
    const accent = relance ? RELANCE_COLOR : s.color;

    const toggleFav = (e) => {
        e.stopPropagation();
        onToggleFavorite?.(application.id);
    };

    return (
        <div
            onClick={onSelect}
            className="group relative flex flex-col bg-panel border border-border-soft rounded-[8px] overflow-hidden cursor-pointer transition-all hover:border-border hover:shadow-lg hover:-translate-y-0.5"
            style={{ borderLeftWidth: "4px", borderLeftColor: `${accent}90` }}
        >
            {relance && (
                <div
                    className="flex items-center gap-1 px-3 py-1 text-[9px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${RELANCE_COLOR}18`, color: RELANCE_COLOR }}
                >
                    ⚠ À relancer · {days}j
                </div>
            )}

            <div className="flex flex-col gap-3 p-4">
                {/* Top : remote badge + favori */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {/* Pastille TYPE — première à gauche */}
                        <span
                            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[4px] shrink-0"
                            style={{ backgroundColor: "var(--card)", color: "var(--text-2)", border: "1px solid var(--border-soft)" }}
                            title="Type de contrat"
                        >
                            <IoBriefcaseOutline className="text-[11px]" />
                            {TYPE_LABELS[application.type] || application.type}
                        </span>

                        {/* Pastille REMOTE */}
                        {application.remote && (
                            <span
                                className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[4px] shrink-0"
                                style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
                                title="Télétravail"
                            >
                                <IoGlobeOutline className="text-[11px]" />
                                Remote
                            </span>
                        )}
                    </div>
                    <button
                        onClick={toggleFav}
                        className="shrink-0 transition-colors"
                        style={{ color: favorite ? "#fbbf24" : "var(--text-3)" }}
                        title={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                        {favorite ? <IoStar className="text-[16px]" /> : <IoStarOutline className="text-[16px] hover:text-[#fbbf24]" />}
                    </button>
                </div>

                <div className="min-w-0 -mt-1">
                    <h3 className="text-[15px] font-bold text-text truncate leading-snug">{application.company || "—"}</h3>
                    <p className="text-[12px] text-text-2 truncate mt-0.5">{application.position || "—"}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <InfoLine icon={IoLocationOutline} color="var(--text-3)">{application.location || "—"}</InfoLine>
                    {application.sector && <InfoLine icon={IoBusinessOutline} color="var(--text-3)">{application.sector}</InfoLine>}
                    {application.salary && <InfoLine icon={IoWalletOutline} color="#4ade80">{application.salary}</InfoLine>}
                </div>

                <div className="flex items-center justify-between pt-2 mt-auto border-t border-border-soft/50">
                    <span className="text-[10px] text-text-3">
                        {application.applied_at ? new Date(application.applied_at).toLocaleDateString("fr", { day: "2-digit", month: "short" }) : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-3">
                        <IoTimeOutline className="text-[11px]" />{days}j
                    </span>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onDelete(application.id); }}
                className="absolute bottom-2 right-2 w-5 h-5 flex items-center justify-center rounded-[4px] text-[11px] text-text-3 hover:text-white hover:bg-[#f43f5e] opacity-0 group-hover:opacity-100 transition-all"
                title="Supprimer"
            >
                ✕
            </button>
        </div>
    );
}

function InfoLine({ icon: Icon, color, children }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <Icon className="text-[13px] shrink-0" style={{ color }} />
            <span className="text-[11px] text-text-2 truncate">{children}</span>
        </div>
    );
}