import { useState } from "react";
import { IoClose, IoAddOutline, IoTrashOutline, IoDocumentTextOutline } from "react-icons/io5";
import { createApplication } from "../../api/application";
import { createContact } from "../../api/contacts";
import { createContactMethod } from "../../api/contactMethod";
import { uploadDocument } from "../../api/document";

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const detectType = (v) =>
    v.includes("@") ? "email" : /^[\d\s+]+$/.test(v) ? "phone" : v.toLowerCase().includes("linkedin") ? "linkedin" : "other";

// Modal d'application rapide — prérempli depuis une offre.
export default function QuickApply({ offer, onClose, onCreated }) {
    const [form, setForm] = useState({
        company: offer.company || "",
        position: offer.title || "",
        location: asArray(offer.localisation)[0] || "",
        sector: asArray(offer.sectors)[0] || "",
        salary: offer.salary_min || offer.salary_max
            ? `${offer.salary_min || ""}${offer.salary_max ? " - " + offer.salary_max : ""} ${offer.salary_currency || "€"}`.trim()
            : "",
        url: offer.url || "",
        notes: `Candidature via ${offer.source || "offre"}.`,
        status: "applied",
    });
    const [contacts, setContacts] = useState([]);
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // Contacts
    const addContact = () => setContacts((c) => [...c, { name: "", infos: [""] }]);
    const updContact = (i, field, v) => setContacts((c) => c.map((x, idx) => idx === i ? { ...x, [field]: v } : x));
    const updInfo = (ci, ii, v) => setContacts((c) => c.map((x, idx) => idx === ci ? { ...x, infos: x.infos.map((s, j) => j === ii ? v : s) } : x));
    const addInfo = (ci) => setContacts((c) => c.map((x, idx) => idx === ci ? { ...x, infos: [...x.infos, ""] } : x));
    const rmContact = (i) => setContacts((c) => c.filter((_, idx) => idx !== i));

    const submit = async () => {
        if (!form.company.trim() || !form.position.trim()) return;
        setBusy(true);
        try {
            const res = await createApplication({
                company: form.company, position: form.position, location: form.location,
                sector: form.sector, salary: form.salary, url: form.url,
                notes: form.notes, status: form.status,
            });
            const appId = res.data.id;
            for (const c of contacts) {
                if (!c.name.trim()) continue;
                const cr = await createContact({ name: c.name, application_id: appId });
                for (const info of c.infos.filter((i) => i.trim()))
                    await createContactMethod(cr.data.id, { type: detectType(info), value: info });
            }
            for (const f of files) await uploadDocument(appId, f);
            onCreated?.();
            onClose?.();
        } catch (e) { console.error("QuickApply", e); }
        finally { setBusy(false); }
    };

    const input = "w-full bg-card border border-border-soft rounded-[5px] px-3 py-2 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent font-mono";
    const label = "text-text-3 uppercase text-[10px] tracking-wider mb-1 block";

    return (
        <div className="fixed inset-0 bg-bg/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-panel border border-border rounded-[8px] w-full max-w-lg max-h-[88vh] overflow-y-auto custom-scroll font-mono" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft sticky top-0 bg-panel z-10">
                    <div>
                        <h2 className="text-[14px] font-bold uppercase tracking-wide text-text">Application rapide</h2>
                        <p className="text-[10px] text-text-3 mt-0.5">Prérempli depuis l'offre</p>
                    </div>
                    <button onClick={onClose} className="text-text-2 hover:text-text"><IoClose className="text-lg" /></button>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={label}>Entreprise *</label><input className={input} value={form.company} onChange={(e) => set("company", e.target.value)} /></div>
                        <div><label className={label}>Poste *</label><input className={input} value={form.position} onChange={(e) => set("position", e.target.value)} /></div>
                        <div><label className={label}>Localisation</label><input className={input} value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
                        <div><label className={label}>Secteur</label><input className={input} value={form.sector} onChange={(e) => set("sector", e.target.value)} /></div>
                        <div><label className={label}>Salaire</label><input className={input} value={form.salary} onChange={(e) => set("salary", e.target.value)} /></div>
                        <div><label className={label}>Statut</label>
                            <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                                <option value="to_apply">À postuler</option>
                                <option value="applied">Postulé</option>
                            </select>
                        </div>
                    </div>
                    <div><label className={label}>Offre (URL)</label><input className={input} value={form.url} onChange={(e) => set("url", e.target.value)} /></div>
                    <div><label className={label}>Notes</label><textarea rows={2} className={`${input} resize-none`} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>

                    {/* Contacts */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={label}>Contacts</label>
                            <button onClick={addContact} className="text-[10px] text-accent hover:text-accent-2 flex items-center gap-1"><IoAddOutline /> Ajouter</button>
                        </div>
                        {contacts.map((c, ci) => (
                            <div key={ci} className="bg-card border border-border-soft rounded-[5px] p-2.5 mb-2 flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input className={input} placeholder="Nom" value={c.name} onChange={(e) => updContact(ci, "name", e.target.value)} />
                                    <button onClick={() => rmContact(ci)} className="shrink-0 w-8 flex items-center justify-center text-text-3 hover:text-[#f43f5e]"><IoTrashOutline /></button>
                                </div>
                                {c.infos.map((info, ii) => (
                                    <div key={ii} className="flex gap-2">
                                        <input className={input} placeholder="Email / tél / LinkedIn" value={info} onChange={(e) => updInfo(ci, ii, e.target.value)} />
                                        {ii === c.infos.length - 1 && <button onClick={() => addInfo(ci)} className="shrink-0 w-8 flex items-center justify-center text-text-3 hover:text-accent"><IoAddOutline /></button>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Documents */}
                    <div>
                        <label className={label}>Documents</label>
                        <label className="flex items-center justify-center gap-2 border border-dashed border-border-soft rounded-[5px] py-3 text-[11px] text-text-3 hover:text-accent hover:border-accent cursor-pointer transition-colors">
                            <IoDocumentTextOutline /> Ajouter des fichiers
                            <input type="file" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
                        </label>
                        {files.map((f, i) => <p key={i} className="text-[10px] text-text-2 mt-1 truncate">📄 {f.name}</p>)}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-soft sticky bottom-0 bg-panel">
                    <button onClick={onClose} className="text-[11px] text-text-3 hover:text-text px-4 py-2 uppercase tracking-wide">Annuler</button>
                    <button onClick={submit} disabled={busy || !form.company.trim() || !form.position.trim()}
                        className="text-[11px] text-bg bg-accent hover:bg-accent-2 px-5 py-2 rounded-[4px] tracking-wider uppercase font-bold disabled:opacity-50">
                        {busy ? "Création..." : "Postulé"}
                    </button>
                </div>
            </div>
        </div>
    );
}
