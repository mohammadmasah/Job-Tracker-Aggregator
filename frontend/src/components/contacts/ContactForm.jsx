import { useState } from "react";
import { IoClose, IoAddOutline, IoTrashOutline } from "react-icons/io5";
import { createContact } from "../../api/contacts";
import { createContactMethod } from "../../api/contactMethod";

// Détecte le type d'une méthode à partir de sa valeur
function detectType(value) {
    if (value.includes("@")) return "email";
    if (/^[\d\s+]+$/.test(value)) return "phone";
    if (value.toLowerCase().includes("linkedin")) return "linkedin";
    return "other";
}

export default function ContactForm({ applications = [], onClose, onCreated }) {
    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [applicationId, setApplicationId] = useState("");
    const [infos, setInfos] = useState([""]);
    const [busy, setBusy] = useState(false);

    const updateInfo = (i, v) => setInfos((prev) => prev.map((x, idx) => (idx === i ? v : x)));
    const addInfo = () => setInfos((prev) => [...prev, ""]);
    const removeInfo = (i) => setInfos((prev) => prev.filter((_, idx) => idx !== i));

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setBusy(true);
        try {
            // 1. Créer le contact
            const res = await createContact({
                name: name.trim(),
                notes: notes.trim() || null,
                application_id: applicationId ? Number(applicationId) : null,
            });
            const contactId = res.data.id;

            // 2. Créer ses méthodes (non vides)
            for (const info of infos.filter((i) => i.trim())) {
                await createContactMethod(contactId, { type: detectType(info), value: info.trim() });
            }

            onCreated?.();   // rafraîchit la liste côté parent
            onClose?.();
        } catch (e) {
            console.error("Erreur création contact", e);
        } finally {
            setBusy(false);
        }
    };

    const input = "w-full bg-card border border-border-soft rounded-[5px] px-3 py-2 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent font-mono";
    const label = "text-text-3 uppercase text-[10px] tracking-wider mb-1.5 block";

    return (
        <div className="fixed inset-0 bg-bg/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-panel border border-border rounded-[6px] w-full max-w-md max-h-[85vh] overflow-y-auto custom-scroll font-mono"
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft sticky top-0 bg-panel">
                    <h2 className="text-[14px] font-bold uppercase tracking-wide text-text">Nouveau contact</h2>
                    <button onClick={onClose} className="text-text-2 hover:text-text text-lg leading-none">
                        <IoClose />
                    </button>
                </div>

                {/* Corps */}
                <div className="p-6 flex flex-col gap-4">
                    {/* Nom */}
                    <div>
                        <label className={label}>Nom *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jean Dupont"
                            autoFocus
                            className={input}
                        />
                    </div>

                    {/* Candidature liée (optionnel) */}
                    <div>
                        <label className={label}>Candidature liée</label>
                        <select
                            value={applicationId}
                            onChange={(e) => setApplicationId(e.target.value)}
                            className={input}
                        >
                            <option value="">Contact libre (aucune)</option>
                            {applications.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.company} — {a.position}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Méthodes de contact */}
                    <div>
                        <label className={label}>Coordonnées</label>
                        <div className="flex flex-col gap-2">
                            {infos.map((info, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={info}
                                        onChange={(e) => updateInfo(i, e.target.value)}
                                        placeholder="Email / téléphone / LinkedIn..."
                                        className={input}
                                    />
                                    {i === infos.length - 1 ? (
                                        <button
                                            type="button"
                                            onClick={addInfo}
                                            className="shrink-0 w-9 flex items-center justify-center bg-card border border-border-soft rounded-[5px] text-text-2 hover:text-accent hover:border-accent transition-colors"
                                        >
                                            <IoAddOutline className="text-[16px]" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeInfo(i)}
                                            className="shrink-0 w-9 flex items-center justify-center bg-card border border-border-soft rounded-[5px] text-text-2 hover:text-[#f43f5e] transition-colors"
                                        >
                                            <IoTrashOutline className="text-[14px]" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={label}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes sur ce contact..."
                            rows={3}
                            className={`${input} resize-none`}
                        />
                    </div>
                </div>

                {/* Pied */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-soft sticky bottom-0 bg-panel">
                    <button
                        onClick={onClose}
                        className="text-[11px] text-text-3 hover:text-text px-4 py-2 transition-colors uppercase tracking-wide"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={busy || !name.trim()}
                        className="text-[11px] text-bg bg-accent hover:bg-accent-2 px-5 py-2 rounded-[4px] tracking-wider uppercase transition-colors font-bold disabled:opacity-50"
                    >
                        {busy ? "Création..." : "Créer"}
                    </button>
                </div>
            </div>
        </div>
    );
}