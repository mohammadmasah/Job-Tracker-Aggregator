import { useMemo, useState, useRef, useEffect } from "react";
import {
    IoMailOutline, IoCallOutline, IoLogoLinkedin, IoLinkOutline,
    IoSearchOutline, IoBusinessOutline, IoPersonOutline, IoAddOutline,
    IoPencil, IoTrashOutline, IoBriefcaseOutline, IoArrowBack, IoOpenOutline, IoArrowForward, IoClose,
} from "react-icons/io5";
import { METHOD_COLORS, STATUS_META } from "../../constants/status";
import { updateContact, deleteContact } from "../../api/contacts";
import { createContactMethod, deleteContactMethod } from "../../api/contactMethod";
import { activeApplicationStore } from "../../stores/activeApplication";
import ApplicationDetail from "./../applications/ApplicationDetail";

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function methodIcon(type) {
    switch (type) {
        case "email": return <IoMailOutline />;
        case "phone": return <IoCallOutline />;
        case "linkedin": return <IoLogoLinkedin />;
        default: return <IoLinkOutline />;
    }
}

const methodLabel = { email: "Email", phone: "Téléphone", linkedin: "LinkedIn", other: "Autre" };
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const METHOD_FILTERS = [
    { value: "email", label: "Email", color: "var(--c1)" },
    { value: "phone", label: "Tél", color: "var(--c2)" },
    { value: "linkedin", label: "LinkedIn", color: "var(--c3)" },
    { value: "other", label: "Autre", color: "var(--c4)" },
];

const PANEL_SLIDE_CSS = `@keyframes panel-slide-in { from { transform: translateX(100%); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } } .panel-slide { animation: panel-slide-in 0.22s ease-out; }`;

export default function ContactList({ contacts, applications, onUpdated }) {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [linkFilter, setLinkFilter] = useState("all"); // all | linked | free
    const [methodFilter, setMethodFilter] = useState("all");
    const [viewingApp, setViewingApp] = useState(null);   // candidature affichée inline
    const listRef = useRef(null);

    const appOf = (contact) =>
        contact?.application_id ? applications.find((a) => a.id === contact.application_id) : null;

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return [...contacts]
            .filter((c) => {
                const company = appOf(c)?.company || "";
                if (q && !c.name.toLowerCase().includes(q) && !company.toLowerCase().includes(q)) return false;
                if (linkFilter === "linked" && !c.application_id) return false;
                if (linkFilter === "free" && c.application_id) return false;
                if (methodFilter !== "all") {
                    const ms = c.methods || [];
                    const has = methodFilter === "other"
                        ? ms.some((m) => !["email", "phone", "linkedin"].includes(m.type))
                        : ms.some((m) => m.type === methodFilter);
                    if (!has) return false;
                }
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    }, [contacts, search, applications, linkFilter, methodFilter]);

    // Regroupement par première lettre
    const grouped = useMemo(() => {
        const groups = {};
        for (const c of filtered) {
            const letter = (c.name?.[0] || "#").toUpperCase();
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(c);
        }
        return groups;
    }, [filtered]);

    const selected = selectedId ? filtered.find((c) => c.id === selectedId) || null : null;

    const presentLetters = new Set(Object.keys(grouped));
    const scrollToLetter = (letter) => {
        const el = listRef.current?.querySelector(`[data-letter="${letter}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Sur mobile : si un contact est sélectionné, on montre la fiche (retour possible)
    const showDetailMobile = Boolean(selected);

    // Focus Poulpie "en attente" quand aucun contact ni candidature n'est ouvert
    useEffect(() => {
        if (!selected && !viewingApp) {
            activeApplicationStore.setWaiting();
        }
    }, [selected, viewingApp]);

    return (
        <div className="h-full flex min-h-0 relative">
            <style>{PANEL_SLIDE_CSS}</style>
            {/* ================= LISTE (gauche) ================= */}
            <div className={`w-full md:w-1/3 md:shrink-0 border-r border-border-soft flex flex-col min-h-0 ${showDetailMobile ? "hidden md:flex" : "flex"}`}>

                {/* Barre de recherche + filtres */}
                <div className="px-6 py-5 border-b border-border-soft shrink-0 flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 bg-card border border-border-soft rounded-[6px] px-3.5 py-2.5 focus-within:border-accent transition-colors">
                        <IoSearchOutline className="text-text-3 text-[16px]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un contact..."
                            className="bg-transparent text-[13px] text-text placeholder-text-3 focus:outline-none font-mono w-full"
                        />
                    </div>

                    {/* UNE seule ligne : segment lié/libre + chips méthodes, défilable horizontalement */}
                    <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-0.5">
                        {/* Segment lié / libre */}
                        <div className="flex items-center rounded-[5px] border border-border-soft overflow-hidden shrink-0">
                            {[
                                { v: "all", l: "Tous" },
                                { v: "linked", l: "Liés" },
                                { v: "free", l: "Libres" },
                            ].map((o) => (
                                <button
                                    key={o.v}
                                    onClick={() => setLinkFilter(o.v)}
                                    className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1.5 transition-colors"
                                    style={linkFilter === o.v
                                        ? { color: "var(--bg)", backgroundColor: "var(--accent)" }
                                        : { color: "var(--text-3)", backgroundColor: "transparent" }}
                                >
                                    {o.l}
                                </button>
                            ))}
                        </div>

                        <span className="w-px h-4 bg-border-soft shrink-0" />

                        {/* Chips méthodes */}
                        {METHOD_FILTERS.map((m) => {
                            const active = methodFilter === m.value;
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => setMethodFilter(active ? "all" : m.value)}
                                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors shrink-0"
                                    style={active
                                        ? { color: m.color, borderColor: m.color, backgroundColor: `${m.color}18` }
                                        : { color: "var(--text-3)", borderColor: "var(--border-soft)", backgroundColor: "transparent" }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[10px] text-text-3 uppercase tracking-wider">
                        {filtered.length} contact{filtered.length > 1 ? "s" : ""}
                    </p>
                </div>

                {/* Zone scrollable : liste + rail */}
                <div className="flex-1 flex min-h-0">
                    <div ref={listRef} className="flex-1 overflow-y-auto custom-scroll min-h-0">
                        {filtered.length === 0 && (
                            <p className="text-[12px] text-text-3 px-6 py-8 text-center">Aucun contact.</p>
                        )}
                        {Object.entries(grouped).map(([letter, list]) => (
                            <div key={letter} data-letter={letter}>
                                {/* En-tête de lettre */}
                                <div className="sticky top-0 z-10 bg-bg px-6 py-2 border-b border-border-soft/40">
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-accent">{letter}</span>
                                </div>
                                {list.map((c) => {
                                    const active = selected && c.id === selected.id;
                                    const app = appOf(c);
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedId((cur) => (cur === c.id ? null : c.id))}
                                            className="w-full flex items-center gap-3.5 px-6 py-3.5 text-left transition-colors hover:bg-card/60"
                                            style={active
                                                ? { backgroundColor: "var(--card)", boxShadow: "inset 3px 0 0 0 var(--accent)" }
                                                : { boxShadow: "inset 3px 0 0 0 transparent" }}
                                        >
                                            <div className="w-11 h-11 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[13px] font-bold shrink-0">
                                                {getInitials(c.name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[14px] font-semibold text-text truncate leading-tight">{c.name}</div>
                                                <div className="text-[11px] text-text-3 truncate mt-0.5">{app?.company || "Contact libre"}</div>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                {(c.methods || []).slice(0, 3).map((m) => (
                                                    <span key={m.id} className="text-[13px]" style={{ color: METHOD_COLORS[m.type] || "var(--text-3)" }}>
                                                        {methodIcon(m.type)}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Rail alphabétique */}
                    <div className="w-6 shrink-0 bg-bg border-l border-border-soft/40 flex flex-col items-center justify-center gap-px py-3">
                        {ALPHABET.map((letter) => {
                            const present = presentLetters.has(letter);
                            return (
                                <button
                                    key={letter}
                                    onClick={() => present && scrollToLetter(letter)}
                                    disabled={!present}
                                    className={`text-[9px] leading-none py-px w-full transition-colors ${
                                        present ? "text-text-2 font-bold hover:text-accent cursor-pointer" : "text-text-3/25 cursor-default"
                                    }`}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ================= PANNEAU DROITE (2/3) ================= */}
            <div className={`relative flex-1 min-h-0 bg-bg ${showDetailMobile || viewingApp ? "flex flex-col absolute inset-0 md:static md:flex" : "hidden md:block"}`}>
                {/* Fiche contact (toujours rendue en fond) */}
                <div className="h-full overflow-y-auto custom-scroll">
                    {!selected ? (
                        <div className="h-full flex items-center justify-center text-text-3 text-[12px]">Sélectionne un contact.</div>
                    ) : (
                        <ContactDetail
                            key={selected.id}
                            contact={selected}
                            app={appOf(selected)}
                            onRefresh={onUpdated}
                            onDeleted={() => { setSelectedId(null); onUpdated(); }}
                            onBack={() => setSelectedId(null)}
                            onViewApp={(a) => setViewingApp(a)}
                        />
                    )}
                </div>

            </div>

            {/* FENÊTRE candidature — le vrai panneau ApplicationDetail (glisse depuis la droite) */}
            {viewingApp && (
                <ApplicationDetail
                    application={viewingApp}
                    onClose={() => {
                        setViewingApp(null);
                        // reprendre le focus contact (halo couleur contact)
                        if (selected) activeApplicationStore.setContact(selected);
                    }}
                    onDelete={() => {
                        setViewingApp(null);
                        if (selected) activeApplicationStore.setContact(selected);
                    }}
                    onRefresh={onUpdated}
                    favorite={false}
                    onToggleFavorite={() => {}}
                />
            )}
        </div>
    );
}

function ContactDetail({ contact, app, onRefresh, onDeleted, onBack, onViewApp }) {

    // Focus chatbot : Poulpie se met en contexte sur le CONTACT ouvert (halo couleur contact).
    useEffect(() => {
        activeApplicationStore.setContact(contact);
        return () => activeApplicationStore.clear();
    }, [contact]);
    const isLinked = Boolean(app);
    const methods = contact.methods || [];
    const methodColor = (type) => METHOD_COLORS[type] || "var(--text-3)";

    const [editingName, setEditingName] = useState(false);
    const [name, setName] = useState(contact.name);
    const [busy, setBusy] = useState(false);
    const [newMethod, setNewMethod] = useState("");

    const detectType = (v) => {
        if (v.includes("@")) return "email";
        if (/^[\d\s+]+$/.test(v)) return "phone";
        if (v.includes("linkedin")) return "linkedin";
        return "other";
    };

    const saveName = async () => {
        setEditingName(false);
        if (name.trim() && name !== contact.name) {
            setBusy(true);
            try { await updateContact(contact.id, { name: name.trim() }); await onRefresh(); }
            finally { setBusy(false); }
        }
    };

    const addMethod = async () => {
        if (!newMethod.trim()) return;
        setBusy(true);
        try {
            await createContactMethod(contact.id, { type: detectType(newMethod), value: newMethod.trim() });
            setNewMethod("");
            await onRefresh();
        } finally { setBusy(false); }
    };

    const removeMethod = async (id) => {
        setBusy(true);
        try { await deleteContactMethod(id); await onRefresh(); } finally { setBusy(false); }
    };

    const handleDelete = async () => {
        setBusy(true);
        try {
            for (const m of methods) await deleteContactMethod(m.id);
            await deleteContact(contact.id);
            onDeleted();
        } finally { setBusy(false); }
    };

    return (
        <div className="px-6 md:px-12 py-10 ">
            {/* Retour (mobile) */}
            <button onClick={onBack} className="md:hidden flex items-center gap-1.5 text-[12px] text-text-3 hover:text-text mb-5 transition-colors">
                <IoArrowBack className="text-[15px]" /> Retour
            </button>

            {/* En-tête fiche */}
            <div className="flex items-start justify-between gap-4 mb-10">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[26px] font-bold shrink-0">
                        {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0">
                        {editingName ? (
                            <input
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                                onBlur={saveName}
                                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                                className="text-[24px] font-bold text-text bg-transparent border-b border-accent focus:outline-none"
                            />
                        ) : (
                            <h2 className="text-[24px] font-bold text-text truncate flex items-center gap-2 group cursor-pointer" onClick={() => setEditingName(true)}>
                                {contact.name}
                                <IoPencil className="text-text-3/50 text-[15px] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h2>
                        )}
                        <div className="mt-1.5">
                            {isLinked ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-accent border border-accent/40 px-2 py-0.5 rounded-[4px]">
                                    <IoBusinessOutline className="text-[12px]" />{app.company}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-text-3 border border-border-soft px-2 py-0.5 rounded-[4px]">
                                    <IoPersonOutline className="text-[12px]" />Contact libre
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleDelete}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide px-3 py-2 rounded-[5px] transition-colors disabled:opacity-50"
                        style={{ color: "#f43f5e", border: "1px solid #f43f5e66" }}
                    >
                        <IoTrashOutline className="text-[13px]" />Supprimer
                    </button>
                    {/* Fermer / désélectionner le contact */}
                    <button
                        onClick={onBack}
                        title="Fermer"
                        className="w-9 h-9 flex items-center justify-center rounded-[5px] border border-border-soft text-text-3 hover:text-text hover:border-border transition-colors"
                    >
                        <IoClose className="text-[18px]" />
                    </button>
                </div>
            </div>

            {/* SECTIONS — grille 2 colonnes pour occuper l'espace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
                {/* Colonne gauche : coordonnées */}
                <section className="lg:row-span-2">
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-3">Coordonnées</p>
                    <div className="flex flex-col gap-2">
                        {methods.length === 0 && <p className="text-[12px] text-text-3">Aucune coordonnée.</p>}
                        {methods.map((m) => (
                            <div key={m.id} className="group flex items-center gap-3 bg-card border border-border-soft rounded-[6px] px-4 py-3">
                                <span className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[15px] shrink-0" style={{ backgroundColor: `${methodColor(m.type)}18`, color: methodColor(m.type) }}>
                                    {methodIcon(m.type)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[9px] uppercase tracking-wide text-text-3">{methodLabel[m.type] || "Autre"}</div>
                                    <div className="text-[13px] text-text truncate">{m.value}</div>
                                </div>
                                <button onClick={() => removeMethod(m.id)} className="text-text-3 hover:text-[#f43f5e] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Supprimer">
                                    <IoTrashOutline className="text-[14px]" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                value={newMethod}
                                onChange={(e) => setNewMethod(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addMethod()}
                                placeholder="Email / téléphone / LinkedIn..."
                                className="flex-1 bg-card border border-border-soft rounded-[6px] px-3 py-2.5 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent"
                            />
                            <button onClick={addMethod} disabled={busy || !newMethod.trim()} className="shrink-0 w-9 h-9 flex items-center justify-center bg-accent text-bg rounded-[6px] hover:bg-accent-2 disabled:opacity-50 transition-colors">
                                <IoAddOutline className="text-[18px]" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Colonne droite : candidature */}
                <section>
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-3">Candidature liée</p>
                    {isLinked ? (
                        <div className="bg-card border border-border-soft rounded-[6px] p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_META[app.status]?.color || "var(--accent)" }} />
                                <span className="text-[11px] uppercase tracking-wide" style={{ color: STATUS_META[app.status]?.color }}>
                                    {STATUS_META[app.status]?.label || app.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[14px] text-text font-semibold">
                                <IoBusinessOutline className="text-text-3" />{app.company}
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-text-2">
                                <IoBriefcaseOutline className="text-text-3" />{app.position}
                            </div>

                            {/* Détails supplémentaires de la candidature */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {app.location && (
                                    <DetailChip label="Lieu">{app.remote ? "Télétravail" : app.location}</DetailChip>
                                )}
                                {app.type && <DetailChip label="Type">{app.type}</DetailChip>}
                                {app.salary && <DetailChip label="Salaire" accent="#4ade80">{app.salary}</DetailChip>}
                                {app.sector && <DetailChip label="Secteur">{app.sector}</DetailChip>}
                            </div>

                            {/* Liens */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-border-soft/60">
                                <button
                                    onClick={() => onViewApp?.(app)}
                                    className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-2 transition-colors"
                                >
                                    <IoArrowForward className="text-[13px]" />
                                    Voir la candidature
                                </button>
                                {app.url && (
                                    <>
                                        <span className="w-px h-3.5 bg-border-soft" />
                                        <a
                                            href={app.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[11px] text-text-2 hover:text-accent transition-colors"
                                        >
                                            <IoOpenOutline className="text-[13px]" />
                                            Ouvrir l'offre
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-[12px] text-text-3">Ce contact n'est lié à aucune candidature.</p>
                    )}
                </section>

                {/* Notes */}
                <section>
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-3">Notes</p>
                    <p className="text-[12px] text-text-3">Les notes par contact ne sont pas encore disponibles.</p>
                </section>
            </div>
        </div>
    );
}

function DetailChip({ label, children, accent }) {
    return (
        <div className="bg-bg border border-border-soft rounded-[5px] px-2.5 py-1.5">
            <div className="text-[8px] uppercase tracking-wider text-text-3">{label}</div>
            <div className="text-[11px] truncate" style={{ color: accent || "var(--text)" }}>{children}</div>
        </div>
    );
}