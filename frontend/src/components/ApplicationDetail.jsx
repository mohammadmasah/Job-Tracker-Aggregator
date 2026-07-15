    import { useState, useEffect } from "react";
    import { activeApplicationStore } from "../stores/activeApplication";
    import { IoStar, IoStarOutline, IoPencil, IoOpenOutline, IoTrashOutline, IoBusinessOutline, IoBriefcaseOutline } from "react-icons/io5";
    import { STATUS_META, METHOD_COLORS, needsRelance, daysSince, RELANCE_COLOR } from "../constants/status";
    import { getApplicationById, updateApplication } from "../api/application";
    import { createContact, updateContact, deleteContact } from "../api/contacts";
    import { createContactMethod, updateContactMethod, deleteContactMethod } from "../api/contactMethod";
    import { uploadDocument, deleteDocument } from "../api/document";

    const detectType = (value) => {
        if (value.includes("@")) return "email";
        if (/^[\d\s+]+$/.test(value)) return "phone";
        if (value.includes("linkedin")) return "linkedin";
        return "other";
    };

    const TYPE_OPTIONS = [
        { value: "alternance", label: "Alternance" },
        { value: "stage", label: "Stage" },
        { value: "cdi", label: "CDI" },
        { value: "cdd", label: "CDD" },
    ];

    export default function ApplicationDetail({ application, onClose, onDelete, onRefresh, favorite, onToggleFavorite }) {
        const [app, setApp] = useState(application);
        const [busy, setBusy] = useState(false);

        // Signale à Poulpie la candidature actuellement consultée
        useEffect(() => {
            activeApplicationStore.set(app);
            return () => activeApplicationStore.clear();
        }, [app]);

        const s = STATUS_META[app.status] || { label: app.status, color: "var(--text-3)" };
        const relance = needsRelance(app);
        const days = daysSince(app.applied_at);

        const refresh = async () => {
            const res = await getApplicationById(app.id);
            setApp(res.data);
            onRefresh?.();
        };

        const saveField = async (field, value) => {
            if (app[field] === value) return;
            setBusy(true);
            try { await updateApplication(app.id, { [field]: value }); await refresh(); }
            finally { setBusy(false); }
        };

        const handleUploadDoc = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setBusy(true);
            try { await uploadDocument(app.id, file); await refresh(); } finally { setBusy(false); }
        };

        const handleDeleteDoc = async (id) => {
            setBusy(true);
            try { await deleteDocument(id); await refresh(); } finally { setBusy(false); }
        };

        // Supprime d'abord les méthodes (contrainte FK), puis le contact
        const handleDeleteContact = async (contact) => {
            setBusy(true);
            try {
                for (const m of contact.methods || []) {
                    await deleteContactMethod(m.id);
                }
                await deleteContact(contact.id);
                await refresh();
            } finally { setBusy(false); }
        };

        return (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
                <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />

                <div
                    className="relative w-full max-w-2xl h-full bg-panel border-l-4 overflow-y-auto custom-scroll font-mono flex flex-col"
                    style={{ borderLeftColor: s.color }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* En-tête */}
                    <div className="p-6 pb-5 border-b border-border-soft">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusSelect value={app.status} color={s.color} onChange={(v) => saveField("status", v)} />
                                {relance && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-[5px]" style={{ backgroundColor: `${RELANCE_COLOR}18`, color: RELANCE_COLOR }}>
                                        ⚠ Relance · {days}j
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <button onClick={() => onToggleFavorite?.(app.id)} style={{ color: favorite ? "#fbbf24" : "var(--text-3)" }} title={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}>
                                    {favorite ? <IoStar className="text-[18px]" /> : <IoStarOutline className="text-[18px] hover:text-[#fbbf24]" />}
                                </button>
                                <button onClick={onClose} className="text-text-2 hover:text-text text-lg">✕</button>
                            </div>
                        </div>

                        {/* Entreprise + poste : clairement éditables */}
                        <HeaderEditable value={app.company} onSave={(v) => saveField("company", v)} placeholder="Entreprise" size="lg" icon={IoBusinessOutline} />
                        <HeaderEditable value={app.position} onSave={(v) => saveField("position", v)} placeholder="Poste" size="sm" icon={IoBriefcaseOutline} />
                    </div>

                    <div className="flex-1 p-6 flex flex-col gap-7 text-[12px]">
                        {/* DÉTAILS — 2 colonnes, ordre du formulaire */}
                        <section>
                            <SectionTitle>Détails</SectionTitle>
                            <div className="grid grid-cols-2 gap-2.5">
                                <EditableBox label="Localisation" value={app.location} onSave={(v) => saveField("location", v)} />
                                <EditableBox label="Secteur" value={app.sector} onSave={(v) => saveField("sector", v)} />
                                <EditableBox label="Salaire" value={app.salary} onSave={(v) => saveField("salary", v)} />
                                <SelectBox label="Type" value={app.type} options={TYPE_OPTIONS} onChange={(v) => saveField("type", v)} />
                                <ToggleBox label="Télétravail" value={app.remote} onToggle={() => saveField("remote", !app.remote)} />
                                <DateBox label="Date" value={app.applied_at} onSave={(v) => saveField("applied_at", v)} />
                                <div className="col-span-2">
                                    <UrlBox label="Offre" value={app.url} onSave={(v) => saveField("url", v)} />
                                </div>
                            </div>
                        </section>

                        {/* NOTES */}
                        <section>
                            <SectionTitle>Notes</SectionTitle>
                            <EditableTextarea value={app.notes} onSave={(v) => saveField("notes", v)} placeholder="Ajouter des notes..." />
                        </section>

                        {/* CONTACTS */}
                        <section>
                            <SectionTitle count={app.contacts?.length}>Contacts</SectionTitle>
                            <div className="grid grid-cols-2 gap-2">
                                {app.contacts?.map((c) => (
                                    <ContactRow key={c.id} contact={c} onRefresh={refresh} onDelete={() => handleDeleteContact(c)} setBusy={setBusy} busy={busy} />
                                ))}
                                <div className="col-span-2">
                                    <AddContactForm applicationId={app.id} onRefresh={refresh} setBusy={setBusy} busy={busy} />
                                </div>
                            </div>
                        </section>

                        {/* DOCUMENTS */}
                        <section>
                            <SectionTitle count={app.documents?.length}>Documents</SectionTitle>
                            <div className="flex flex-col gap-1.5">
                                {app.documents?.map((d) => (
                                    <div key={d.id} className="group flex items-center justify-between bg-card border border-border-soft rounded-[6px] px-3 py-2">
                                        <span className="text-[11px] text-text/90 truncate flex items-center gap-2"><span className="text-text-3">▤</span>{d.filename}</span>
                                        <button onClick={() => handleDeleteDoc(d.id)} className="text-text-3 hover:text-[#f43f5e] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" title="Supprimer">
                                            <IoTrashOutline className="text-[13px]" />
                                        </button>
                                    </div>
                                ))}
                                <label className="cursor-pointer flex items-center justify-center gap-2 py-2.5 text-[11px] text-text-2 border border-dashed border-border rounded-[6px] hover:border-accent hover:text-text transition-colors">
                                    ↓ Téléverser un document
                                    <input type="file" className="hidden" onChange={handleUploadDoc} />
                                </label>
                            </div>
                        </section>
                    </div>

                    {/* Pied — Supprimer à gauche (libère le coin de Poulpie), statut à droite */}
                    <div className="p-6 pr-24 border-t border-border-soft sticky bottom-0 bg-panel flex justify-between items-center gap-4">
                        <button onClick={() => onDelete(app.id)} className="px-4 py-2 text-[11px] uppercase tracking-wide rounded-[4px] transition-colors shrink-0" style={{ color: "#f43f5e", border: "1px solid #f43f5e66" }}>
                            Supprimer
                        </button>
                        <span className="text-[10px] text-text-3 shrink-0">{busy ? "Enregistrement..." : "✓ Enregistré"}</span>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- Sous-composants ---------- */

    function SectionTitle({ children, count }) {
        return (
            <p className="text-text-3 uppercase text-[10px] tracking-wider mb-3 flex items-center gap-2">
                {children}
                {count > 0 && <span className="text-text-2 normal-case">({count})</span>}
            </p>
        );
    }

    // Entreprise / poste dans l'en-tête — visiblement éditables (icône crayon + soulignement au survol)
    function HeaderEditable({ value, onSave, placeholder, size, icon: Icon }) {
        const [val, setVal] = useState(value || "");
        const big = size === "lg";
        return (
            <div className="group/edit flex items-center gap-2">
                {Icon && (
                    <Icon className={`text-text-3 shrink-0 ${big ? "text-[18px]" : "text-[13px]"}`} />
                )}
                <input
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onBlur={() => onSave(val)}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    placeholder={placeholder}
                    className={`bg-transparent focus:outline-none placeholder-text-3/40 border-b border-transparent hover:border-border-soft focus:border-accent transition-colors min-w-0 flex-1 ${
                        big ? "text-[22px] font-bold text-text leading-tight" : "text-[13px] text-text-3"
                    }`}
                />
                <IoPencil className="text-text-3/50 text-[13px] opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" />
            </div>
        );
    }

    // Champ texte éditable en "boîte" (label + valeur), style claire d'input
    function EditableBox({ label, value, onSave }) {
        const [val, setVal] = useState(value || "");
        return (
            <div className="bg-card border border-border-soft rounded-[6px] px-3 py-2 focus-within:border-accent transition-colors">
                <label className="block text-[9px] uppercase tracking-wide text-text-3 mb-0.5">{label}</label>
                <input
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onBlur={() => onSave(val)}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    placeholder="—"
                    className="w-full bg-transparent text-[12px] text-text/90 placeholder-text-3/40 focus:outline-none"
                />
            </div>
        );
    }

    function SelectBox({ label, value, options, onChange }) {
        return (
            <div className="bg-card border border-border-soft rounded-[6px] px-3 py-2 focus-within:border-accent transition-colors">
                <label className="block text-[9px] uppercase tracking-wide text-text-3 mb-0.5">{label}</label>
                <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-[12px] text-text/90 focus:outline-none cursor-pointer">
                    {options.map((o) => (
                        <option key={o.value} value={o.value} className="bg-panel">{o.label}</option>
                    ))}
                </select>
            </div>
        );
    }

    function ToggleBox({ label, value, onToggle }) {
        return (
            <div className="bg-card border border-border-soft rounded-[6px] px-3 py-2">
                <label className="block text-[9px] uppercase tracking-wide text-text-3 mb-1">{label}</label>
                <button
                    onClick={onToggle}
                    className="text-[11px] px-2 py-0.5 rounded-[3px] border transition-colors"
                    style={{
                        color: value ? "var(--accent)" : "var(--text-3)",
                        borderColor: value ? "var(--accent)" : "var(--border-soft)",
                    }}
                >
                    {value ? "Oui" : "Non"}
                </button>
            </div>
        );
    }

    function DateBox({ label, value, onSave }) {
        return (
            <div className="bg-card border border-border-soft rounded-[6px] px-3 py-2 focus-within:border-accent transition-colors">
                <label className="block text-[9px] uppercase tracking-wide text-text-3 mb-0.5">{label}</label>
                <input
                    type="date"
                    defaultValue={value ? value.slice(0, 10) : ""}
                    onBlur={(e) => e.target.value && onSave(e.target.value)}
                    className="w-full bg-transparent text-[12px] text-text/90 focus:outline-none cursor-pointer"
                />
            </div>
        );
    }

    function UrlBox({ label, value, onSave }) {
        const [val, setVal] = useState(value || "");
        return (
            <div className="bg-card border border-border-soft rounded-[6px] px-3 py-2 focus-within:border-accent transition-colors flex items-center gap-2">
                <div className="min-w-0 flex-1">
                    <label className="block text-[9px] uppercase tracking-wide text-text-3 mb-0.5">{label}</label>
                    <input
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onBlur={() => onSave(val)}
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                        placeholder="https://—"
                        className="w-full bg-transparent text-[12px] text-text/90 placeholder-text-3/40 focus:outline-none truncate"
                    />
                </div>
                {value && (
                    <a href={value} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-2 shrink-0" title="Ouvrir l'offre">
                        <IoOpenOutline className="text-[15px]" />
                    </a>
                )}
            </div>
        );
    }

    function EditableTextarea({ value, onSave, placeholder }) {
        const [val, setVal] = useState(value || "");
        return (
            <textarea
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={() => onSave(val)}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-card border border-border-soft rounded-[6px] p-3 text-[12px] text-text/90 placeholder-text-3/50 focus:outline-none focus:border-accent resize-none transition-colors"
            />
        );
    }

    function StatusSelect({ value, color, onChange }) {
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] relative" style={{ backgroundColor: `${color}18` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-[10px] uppercase tracking-wide focus:outline-none cursor-pointer appearance-none pr-3" style={{ color }}>
                    {Object.entries(STATUS_META).map(([v, m]) => (
                        <option key={v} value={v} className="bg-panel text-text normal-case">{m.label}</option>
                    ))}
                </select>
                <span className="absolute right-2 pointer-events-none text-[8px]" style={{ color }}>▼</span>
            </div>
        );
    }

    // --- Contact avec édition inline + plusieurs méthodes ---
    function ContactRow({ contact, onRefresh, onDelete, busy, setBusy }) {
        const [editing, setEditing] = useState(false);
        const [name, setName] = useState(contact.name);
        const [methods, setMethods] = useState(contact.methods || []);
        const [newMethods, setNewMethods] = useState([]);

        const methodColor = (type) => METHOD_COLORS[type] || "var(--text-3)";

        const save = async () => {
            setBusy(true);
            try {
                if (name.trim() && name !== contact.name) await updateContact(contact.id, { name: name.trim() });
                for (const m of methods) {
                    const original = contact.methods.find((o) => o.id === m.id);
                    if (original && original.value !== m.value) {
                        await updateContactMethod(m.id, { value: m.value, type: detectType(m.value) });
                    }
                }
                for (const v of newMethods.filter((x) => x.trim())) {
                    await createContactMethod(contact.id, { type: detectType(v), value: v.trim() });
                }
                setNewMethods([]);
                setEditing(false);
                await onRefresh();
            } finally { setBusy(false); }
        };

        const removeMethod = async (id) => {
            setBusy(true);
            try { await deleteContactMethod(id); await onRefresh(); } finally { setBusy(false); }
        };

        const inputCls = "bg-bg border border-border-soft rounded-[4px] px-2 py-1.5 text-[12px] text-text focus:outline-none focus:border-accent w-full";

        if (editing) {
            return (
                <div className="col-span-2 bg-card border border-accent/40 rounded-[6px] p-3 flex flex-col gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className={inputCls} />
                    {methods.map((m, i) => (
                        <div key={m.id} className="flex items-center gap-1.5">
                            <input value={m.value} onChange={(e) => { const c = [...methods]; c[i] = { ...m, value: e.target.value }; setMethods(c); }} className={inputCls} />
                            <button onClick={() => removeMethod(m.id)} className="text-text-3 hover:text-[#f43f5e] text-[12px] shrink-0" title="Supprimer">✕</button>
                        </div>
                    ))}
                    {newMethods.map((v, i) => (
                        <div key={`new-${i}`} className="flex items-center gap-1.5">
                            <input value={v} autoFocus placeholder="Email / téléphone / LinkedIn" onChange={(e) => { const c = [...newMethods]; c[i] = e.target.value; setNewMethods(c); }} className={inputCls} />
                            <button onClick={() => setNewMethods(newMethods.filter((_, j) => j !== i))} className="text-text-3 hover:text-[#f43f5e] text-[12px] shrink-0">✕</button>
                        </div>
                    ))}
                    <button onClick={() => setNewMethods([...newMethods, ""])} className="self-start text-[11px] text-accent hover:text-accent-2 transition-colors">+ Ajouter une méthode</button>
                    <div className="flex gap-2 justify-end mt-1">
                        <button onClick={() => { setEditing(false); setName(contact.name); setMethods(contact.methods || []); setNewMethods([]); }} className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-3 hover:text-text">Annuler</button>
                        <button onClick={save} disabled={busy} className="px-3 py-1.5 text-[10px] uppercase tracking-wide bg-accent text-bg rounded-[3px] hover:bg-accent-2 disabled:opacity-50">Enregistrer</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="group bg-card border border-border-soft rounded-[6px] p-3 hover:border-border transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[11px] font-bold shrink-0">
                            {contact.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-text font-semibold text-[13px] truncate">{contact.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(true)} className="text-text-3 hover:text-accent" title="Modifier"><IoPencil className="text-[12px]" /></button>
                        <button onClick={onDelete} className="text-text-3 hover:text-[#f43f5e]" title="Supprimer"><IoTrashOutline className="text-[13px]" /></button>
                    </div>
                </div>
                {contact.methods?.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2 pl-9">
                        {contact.methods.map((m) => (
                            <span key={m.id} className="text-[11px] px-2 py-0.5 rounded-[3px] border self-start truncate max-w-full" style={{ color: methodColor(m.type), borderColor: methodColor(m.type) }}>
                                {m.value}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    function AddContactForm({ applicationId, onRefresh, setBusy, busy }) {
        const [open, setOpen] = useState(false);
        const [name, setName] = useState("");
        const [infos, setInfos] = useState([""]);

        const reset = () => { setName(""); setInfos([""]); setOpen(false); };

        const save = async () => {
            if (!name.trim()) return;
            setBusy(true);
            try {
                const res = await createContact({ name: name.trim(), application_id: applicationId });
                const contactId = res.data.id;
                for (const info of infos.filter((i) => i.trim())) {
                    await createContactMethod(contactId, { type: detectType(info), value: info.trim() });
                }
                reset();
                await onRefresh();
            } finally { setBusy(false); }
        };

        const inputCls = "bg-bg border border-border-soft rounded-[4px] px-2 py-1.5 text-[12px] text-text focus:outline-none focus:border-accent w-full";

        if (!open) {
            return (
                <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] text-text-2 border border-dashed border-border rounded-[6px] hover:border-accent hover:text-text transition-colors">
                    + Ajouter un contact
                </button>
            );
        }

        return (
            <div className="bg-card border border-accent/40 rounded-[6px] p-3 flex flex-col gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du contact" className={inputCls} autoFocus />
                {infos.map((info, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <input value={info} placeholder="Email / téléphone / LinkedIn" onChange={(e) => { const c = [...infos]; c[i] = e.target.value; setInfos(c); }} className={inputCls} />
                        {infos.length > 1 && <button onClick={() => setInfos(infos.filter((_, j) => j !== i))} className="text-text-3 hover:text-[#f43f5e] text-[12px] shrink-0">✕</button>}
                    </div>
                ))}
                <button onClick={() => setInfos([...infos, ""])} className="self-start text-[11px] text-accent hover:text-accent-2 transition-colors">+ Ajouter une méthode</button>
                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={reset} className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-3 hover:text-text">Annuler</button>
                    <button onClick={save} disabled={busy || !name.trim()} className="px-3 py-1.5 text-[10px] uppercase tracking-wide bg-accent text-bg rounded-[3px] hover:bg-accent-2 disabled:opacity-50">Enregistrer</button>
                </div>
            </div>
        );
    }