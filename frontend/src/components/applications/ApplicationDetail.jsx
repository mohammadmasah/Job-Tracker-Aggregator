import { useState, useEffect } from "react";
import {
    IoClose, IoBriefcaseOutline, IoLocationOutline, IoWalletOutline,
    IoBusinessOutline, IoCalendarOutline, IoOpenOutline, IoStar, IoStarOutline,
} from "react-icons/io5";
import { STATUS_META, STATUS_OPTIONS, RELANCE_COLOR, needsRelance } from "../../constants/status";
import { updateApplication } from "../../api/application";

const TYPE_LABELS_D = { alternance: "Alternance", stage: "Stage", cdi: "CDI", cdd: "CDD" };

// Détail candidature — même format compact que OfferDetail, + statut changeable.
export default function ApplicationDetailPanel({ app, onClose, onRefresh, favorite, onToggleFavorite }) {
    const s = STATUS_META[app.status] || {};
    const relance = needsRelance(app);
    const date = app.applied_at ? new Date(app.applied_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;

    const changeStatus = async (e) => {
        try { await updateApplication(app.id, { status: e.target.value }); await onRefresh?.(); }
        catch (err) { console.error(err); }
    };

    // Sauvegarde d'un champ (au blur si la valeur a changé)
    const saveField = async (field, value) => {
        if (value === (app[field] ?? "")) return;
        try { await updateApplication(app.id, { [field]: value }); await onRefresh?.(); }
        catch (err) { console.error(err); }
    };

    return (
        <div className="px-6 md:px-12 py-10 relative">
            {/* Croix fermer (seulement si onClose fourni) */}
            {onClose && (
                <button onClick={onClose} title="Fermer" className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-[5px] border border-border-soft text-text-3 hover:text-text hover:border-border transition-colors">
                    <IoClose className="text-[17px]" />
                </button>
            )}

            {/* En-tête : logo + entreprise + poste + favori */}
            <div className="flex items-start gap-4 mb-5 pr-10">
                <div className="w-16 h-16 rounded-[8px] flex items-center justify-center text-[22px] font-bold shrink-0" style={{ backgroundColor: `${s.color || "var(--accent)"}22`, color: s.color || "var(--accent)" }}>
                    {(app.company || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <EditableText value={app.company} onSave={(v) => saveField("company", v)} placeholder="Entreprise"
                            className="text-[20px] font-bold text-text leading-snug" />
                        <button onClick={() => onToggleFavorite?.(app.id)} className="shrink-0">
                            {favorite ? <IoStar className="text-[17px]" style={{ color: "var(--c3)" }} /> : <IoStarOutline className="text-[17px] text-text-3 hover:text-[var(--c3)]" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-text-2 text-[13px]">
                        <IoBriefcaseOutline className="text-text-3 shrink-0" />
                        <EditableText value={app.position} onSave={(v) => saveField("position", v)} placeholder="Poste"
                            className="text-[13px] text-text-2" />
                    </div>
                </div>
            </div>

            {/* Statut changeable + relance */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <select value={app.status} onChange={changeStatus}
                    className="text-[11px] font-bold uppercase tracking-wide px-3 py-2 rounded-[5px] border bg-card focus:outline-none font-mono cursor-pointer"
                    style={{ color: s.color, borderColor: `${s.color}66` }}>
                    {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                {relance && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-[4px]" style={{ color: RELANCE_COLOR, border: `1px solid ${RELANCE_COLOR}66` }}>À relancer</span>}
            </div>

            {/* Détails éditables */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <EditField label="Localisation" value={app.location} onSave={(v) => saveField("location", v)} />
                <EditField label="Secteur" value={app.sector} onSave={(v) => saveField("sector", v)} />
                <EditField label="Salaire" value={app.salary} onSave={(v) => saveField("salary", v)} accent="var(--c2)" />
                <EditField label="Type" value={app.type} onSave={(v) => saveField("type", v)} />
                <EditField label="Offre (URL)" value={app.url} onSave={(v) => saveField("url", v)} full />
                {date && <div className="col-span-2 text-[10px] text-text-3">Postulé le {date}</div>}
            </div>

            {/* Description éditable */}
            <div className="mb-6">
                <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Description</p>
                <EditableArea value={app.description} onSave={(v) => saveField("description", v)} placeholder="Ajouter une description..." />
            </div>

            {/* Notes éditables */}
            <div className="mb-6">
                <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Notes</p>
                <EditableArea value={app.notes} onSave={(v) => saveField("notes", v)} placeholder="Ajouter une note..." />
            </div>

            {/* Lien offre */}
            {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:text-accent-2 transition-colors">
                    <IoOpenOutline className="text-[14px]" /> Ouvrir l'offre
                </a>
            )}
        </div>
    );
}

function BadgeD({ icon: Icon, color, children }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-[5px]" style={{ backgroundColor: "var(--card)", color: "var(--text-2)", border: "1px solid var(--border-soft)" }}>
            <Icon className="text-[13px]" style={{ color }} />{children}
        </span>
    );
}

// --- Champs éditables (auto-save au blur) ---
function EditableText({ value, onSave, placeholder, className = "" }) {
    const [v, setV] = useState(value ?? "");
    useEffect(() => setV(value ?? ""), [value]);
    return (
        <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => onSave(v)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder={placeholder}
            className={`bg-transparent border-b border-transparent hover:border-border-soft focus:border-accent focus:outline-none transition-colors min-w-0 flex-1 font-mono ${className}`}
        />
    );
}

function EditField({ label, value, onSave, accent, full }) {
    const [v, setV] = useState(value ?? "");
    useEffect(() => setV(value ?? ""), [value]);
    return (
        <div className={full ? "col-span-2" : ""}>
            <label className="text-[9px] uppercase tracking-wider text-text-3 block mb-1">{label}</label>
            <input
                value={v}
                onChange={(e) => setV(e.target.value)}
                onBlur={() => onSave(v)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="w-full bg-card border border-border-soft rounded-[5px] px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-accent font-mono"
                style={{ color: accent || "var(--text)" }}
            />
        </div>
    );
}

function EditableArea({ value, onSave, placeholder }) {
    const [v, setV] = useState(value ?? "");
    useEffect(() => setV(value ?? ""), [value]);
    return (
        <textarea
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => onSave(v)}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-card border border-border-soft rounded-[6px] px-3 py-2 text-[13px] text-text-2 leading-relaxed focus:outline-none focus:border-accent resize-y font-mono"
        />
    );
}