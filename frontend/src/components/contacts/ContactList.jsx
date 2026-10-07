import { useMemo, useState, useRef, useEffect } from "react";
import {
    IoMailOutline, IoCallOutline, IoLogoLinkedin, IoLinkOutline,
    IoSearchOutline, IoPersonOutline,
} from "react-icons/io5";
import { METHOD_COLORS } from "../../constants/status";
import { activeApplicationStore } from "../../stores/activeApplication";
import ContactDetail from "./ContactDetail";

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

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const METHOD_FILTERS = [
    { value: "email", label: "Email", color: "var(--c1)" },
    { value: "phone", label: "Tél", color: "var(--c2)" },
    { value: "linkedin", label: "LinkedIn", color: "var(--c3)" },
    { value: "other", label: "Autre", color: "var(--c4)" },
];


export default function ContactList({ contacts, applications, onUpdated }) {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [linkFilter, setLinkFilter] = useState("all"); // all | linked | free
    const [methodFilter, setMethodFilter] = useState("all");
    const listRef = useRef(null);

    const appsOf = (contact) =>
        (contact?.application_ids || []).map((id) => applications.find((a) => a.id === id)).filter(Boolean);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return [...contacts]
            .filter((c) => {
                const company = applications.find((app) => c.application_ids?.includes(app.id))?.company || "";
                if (q && !c.name.toLowerCase().includes(q) && !company.toLowerCase().includes(q)) return false;
                const linkedCount = (c.application_ids || []).length;
                if (linkFilter === "linked" && linkedCount === 0) return false;
                if (linkFilter === "free" && linkedCount > 0) return false;
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
        if (selected) activeApplicationStore.setContact(selected);   // contact : halo c3
        else activeApplicationStore.setWaiting();                     // rien : attente
        return () => activeApplicationStore.clear();
    }, [selected]);

    return (
        <div className="h-full flex min-h-0 min-w-0 relative overflow-hidden">
            {/* ================= LISTE (gauche) ================= */}
            <div className={`w-full md:w-[260px] xl:w-[300px] md:shrink-0 min-w-0 border-r border-border-soft flex flex-col min-h-0 ${showDetailMobile ? "hidden md:flex" : "flex"}`}>

                {/* Barre de recherche + filtres */}
                <div className="px-4 py-4 border-b border-border-soft shrink-0 flex flex-col gap-3.5">
                    <div className="flex items-center gap-2.5 bg-card border border-border-soft rounded-[6px] px-3.5 py-2.5 focus-within:border-accent transition-colors">
                        <IoSearchOutline className="text-text-3 text-[16px]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un contact..."
                            aria-label="Rechercher un contact"
                            className="min-w-0 bg-transparent text-[13px] text-text placeholder-text-3 focus:outline-none font-mono w-full"
                        />
                    </div>

                    {/* UNE seule ligne : segment lié/libre + chips méthodes, défilable horizontalement */}
                    <div className="flex flex-wrap items-center gap-2">
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
                                        ? { color: m.color, borderColor: m.color, backgroundColor: `color-mix(in srgb, ${m.color} 10%, transparent)` }
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
                <div className="flex-1 flex min-h-0 min-w-0">
                    <div ref={listRef} className="flex-1 overflow-y-auto custom-scroll min-h-0 min-w-0">
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
                                    const app = appsOf(c)[0];
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedId((cur) => (cur === c.id ? null : c.id))}
                                            aria-pressed={Boolean(active)}
                                            className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-card/60"
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
                                    className={`text-[9px] leading-none py-px w-full transition-colors ${present ? "text-text-2 font-bold hover:text-accent cursor-pointer" : "text-text-3/25 cursor-default"
                                        }`}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ============ FICHE CONTACT (droite) ============ */}
            <div className={`relative flex-1 min-w-0 min-h-0 bg-bg overflow-y-auto overflow-x-hidden custom-scroll ${showDetailMobile ? "flex flex-col absolute inset-0 md:static md:flex" : "hidden md:block"}`}>
                {!selected ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-text-3 text-sm"><IoPersonOutline className="text-3xl text-accent/60" /><span>Sélectionne un contact pour retrouver ses coordonnées et ses candidatures.</span></div>
                ) : (
                    <ContactDetail
                        key={selected.id}
                        contact={selected}
                        apps={appsOf(selected)}
                        allApplications={applications}
                        onRefresh={onUpdated}
                        onDeleted={async () => { setSelectedId(null); await onUpdated(); }}
                        onBack={() => setSelectedId(null)}
                    />
                )}
            </div>
        </div>
    );
}
