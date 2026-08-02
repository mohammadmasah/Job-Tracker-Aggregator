import { useState } from "react";
import {
    IoMailOutline,
    IoCallOutline,
    IoLogoLinkedin,
    IoLinkOutline,
    IoCopyOutline,
    IoCreateOutline,
    IoClose,
    IoBriefcaseOutline,
    IoArrowForward,
} from "react-icons/io5";
import { updateContact } from "../../api/contacts";

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function methodIcon(type) {
    switch (type) {
        case "email":
            return <IoMailOutline />;
        case "phone":
            return <IoCallOutline />;
        case "linkedin":
            return <IoLogoLinkedin />;
        default:
            return <IoLinkOutline />;
    }
}

// Couleurs des méthodes via les variables de palette du thème (--c1..--c4)
function methodColor(type) {
    switch (type) {
        case "email":
            return "var(--c1)";
        case "phone":
            return "var(--c2)";
        case "linkedin":
            return "var(--c3)";
        default:
            return "var(--c4)";
    }
}

// contact : ContactRead sélectionné
// company : nom de l'entreprise liée (ou null)
// applications : pour retrouver la candidature liée (poste + entreprise)
// onClose, onUpdated : callbacks
export default function ContactPanel({ contact, company, applications = [], onClose, onUpdated }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(contact.name);
    const [saving, setSaving] = useState(false);

    const linkedApp = contact.application_id
        ? applications.find((a) => a.id === contact.application_id)
        : null;

    const handleCopy = (value) => {
        navigator.clipboard?.writeText(value);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateContact(contact.id, { name });
            setEditing(false);
            if (onUpdated) await onUpdated();
        } catch (e) {
            console.error("Erreur mise à jour contact", e);
        } finally {
            setSaving(false);
        }
    };

    const methods = contact.methods || [];

    return (
        <>
            {/* Overlay sombre */}
            <div onClick={onClose} className="fixed inset-0 bg-bg/70 z-40" />

            {/* Panneau coulissant */}
            <div className="fixed top-0 right-0 h-full w-[340px] bg-panel border-l border-border z-50 flex flex-col font-mono animate-[slidein_0.18s_ease-out]">
                <style>{`
                    @keyframes slidein {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                `}</style>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft bg-bg-2">
                    <span className="text-[11px] text-text-2 uppercase tracking-wider">Contact</span>
                    <div className="flex gap-3 text-text-2 text-[16px]">
                        {!editing && (
                            <button onClick={() => setEditing(true)} className="hover:text-text" aria-label="Modifier">
                                <IoCreateOutline />
                            </button>
                        )}
                        <button onClick={onClose} className="hover:text-text" aria-label="Fermer">
                            <IoClose />
                        </button>
                    </div>
                </div>

                {/* Identité */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-border-soft">
                    <div className="w-11 h-11 rounded-[6px] bg-accent/15 border border-accent/30 flex items-center justify-center text-[15px] font-bold text-accent">
                        {getInitials(name)}
                    </div>
                    <div className="flex-1">
                        {editing ? (
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-bg border border-border-soft rounded-[4px] px-2 py-1 text-[14px] text-text focus:outline-none focus:border-accent font-mono"
                            />
                        ) : (
                            <div className="text-[15px] font-bold text-text">{name}</div>
                        )}
                        <div className="text-[11px] text-text-2">{company || "Contact libre"}</div>
                    </div>
                </div>

                {/* Moyens de contact */}
                <div className="px-4 py-4 flex-1 overflow-y-auto custom-scroll">
                    <div className="text-[10px] text-text-3 uppercase tracking-wider mb-2.5">
                        Moyens de contact
                    </div>

                    {methods.length === 0 && (
                        <p className="text-[11px] text-text-3">Aucun moyen de contact.</p>
                    )}

                    <div className="flex flex-col gap-1.5">
                        {methods.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-center gap-2.5 px-2.5 py-2 bg-bg border border-border-soft rounded-[4px]"
                            >
                                <span style={{ color: methodColor(m.type), fontSize: "15px" }}>
                                    {methodIcon(m.type)}
                                </span>
                                <span className="text-[12px] text-text flex-1 truncate">{m.value}</span>
                                <button
                                    onClick={() => handleCopy(m.value)}
                                    className="text-text-3 hover:text-text text-[14px]"
                                    aria-label="Copier"
                                >
                                    <IoCopyOutline />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Candidature liée (seulement si lié) */}
                    {linkedApp && (
                        <div className="mt-5">
                            <div className="text-[10px] text-text-3 uppercase tracking-wider mb-2">
                                Candidature liée
                            </div>
                            <a
                                href={`/applications/${linkedApp.id}`}
                                className="flex items-center gap-2.5 px-2.5 py-2.5 bg-accent/10 border border-accent/25 rounded-[4px] hover:bg-accent/20 transition-colors"
                            >
                                <span className="text-accent text-[15px]">
                                    <IoBriefcaseOutline />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] text-text truncate">{linkedApp.position}</div>
                                    <div className="text-[10px] text-text-2 truncate">{linkedApp.company}</div>
                                </div>
                                <span className="text-accent text-[15px]">
                                    <IoArrowForward />
                                </span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer édition */}
                {editing && (
                    <div className="flex gap-2 px-4 py-3 border-t border-border-soft">
                        <button
                            onClick={() => {
                                setEditing(false);
                                setName(contact.name);
                            }}
                            className="flex-1 px-3 py-2 text-[11px] text-text-2 border border-border-soft hover:border-border rounded-[4px] uppercase tracking-wider"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-3 py-2 text-[11px] text-bg bg-accent hover:bg-accent-2 rounded-[4px] uppercase tracking-wider disabled:opacity-50 transition-colors"
                        >
                            {saving ? "..." : "Enregistrer"}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}