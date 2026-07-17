import { useState, useMemo, useEffect } from "react";
import {
    IoSearchOutline, IoLocationOutline, IoWalletOutline, IoBusinessOutline,
    IoBriefcaseOutline, IoGlobeOutline, IoStar, IoStarOutline,
    IoGridOutline, IoListOutline, IoChevronForward, IoFilterOutline, IoChevronDown,
    IoClose, IoCalendarOutline, IoOpenOutline, IoLayersOutline,
} from "react-icons/io5";
import { STATUS_META, STATUS_ORDER, STATUS_OPTIONS, RELANCE_COLOR, needsRelance } from "../../constants/status";
import { updateApplication } from "../../api/application";
import { activeApplicationStore } from "../../stores/activeApplication";
import ApplicationCard from "./ApplicationCard";
import ApplicationRow from "./ApplicationRow";

const TYPE_LABELS = { alternance: "Alternance", stage: "Stage", cdi: "CDI", cdd: "CDD" };

export default function ApplicationsList({ applications = [], onRefresh, onDelete, favorites, onToggleFavorite, initialSelectedId = null }) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedId, setSelectedId] = useState(null);
    useEffect(() => { if (initialSelectedId) setSelectedId(initialSelectedId); }, [initialSelectedId]);
    const [view, setView] = useState(() => localStorage.getItem("app-view") || "list");
    const [collapsed, setCollapsed] = useState({});
    const [defaultsSet, setDefaultsSet] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [relanceOnly, setRelanceOnly] = useState(false);
    const [favOnly, setFavOnly] = useState(false);

    const isFav = (id) => favorites?.includes?.(id);
    const setViewMode = (v) => { setView(v); localStorage.setItem("app-view", v); };
    const toggleCollapse = (k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

    // Filtrage + tri
    const sorted = useMemo(() => {
        const q = search.toLowerCase();
        let r = applications.filter((a) =>
            (statusFilter === "all" || a.status === statusFilter) &&
            (!q || (a.company || "").toLowerCase().includes(q) || (a.position || "").toLowerCase().includes(q)) &&
            (!relanceOnly || needsRelance(a)) &&
            (!favOnly || isFav(a.id))
        );
        return [...r].sort((a, b) => {
            if (sortBy === "recent") return new Date(b.applied_at || 0) - new Date(a.applied_at || 0);
            if (sortBy === "oldest") return new Date(a.applied_at || 0) - new Date(b.applied_at || 0);
            if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
            return 0;
        });
    }, [applications, search, sortBy, statusFilter, relanceOnly, favOnly, favorites]);

    const relances = useMemo(() => sorted.filter(needsRelance), [sorted]);
    const selected = applications.find((a) => a.id === selectedId) || null;
    const showDetailMobile = Boolean(selectedId);

    // Focus Poulpie sur la candidature ouverte (halo accent), sinon en attente
    useEffect(() => {
        if (selected) activeApplicationStore.setApplication(selected);
        else activeApplicationStore.setWaiting();
        return () => activeApplicationStore.clear();
    }, [selected]);

    const openApp = (a) => setSelectedId((cur) => (cur === a.id ? null : a.id));

    // Sections : relance (toujours en haut) + par statut
    const sections = useMemo(() => {
        const out = [];
        if (relances.length) out.push({ key: "relance", label: "À relancer", color: RELANCE_COLOR, items: relances, priority: true });
        for (const st of STATUS_ORDER) {
            const items = sorted.filter((a) => a.status === st);
            if (items.length) out.push({ key: st, label: STATUS_META[st]?.label || st, color: STATUS_META[st]?.color, items });
        }
        return out;
    }, [sorted, relances]);

    const sectionKeys = useMemo(() => sections.map((s) => s.key), [sections]);

    // Replier toutes les sections par défaut (une fois, au premier rendu avec données)
    useEffect(() => {
        if (!defaultsSet && sectionKeys.length > 0) {
            const next = {};
            sectionKeys.forEach((k) => (next[k] = true));
            setCollapsed(next);
            setDefaultsSet(true);
        }
    }, [sectionKeys, defaultsSet]);

    const allCollapsed = sectionKeys.length > 0 && sectionKeys.every((k) => collapsed[k]);
    const toggleAll = () => {
        const v = !allCollapsed;
        const next = {};
        sectionKeys.forEach((k) => (next[k] = v));
        setCollapsed(next);
    };

    return (
        <div className="h-full flex min-h-0">
            {/* ---- LISTE (gauche) ---- */}
            <div className={`w-full ${view === "cards" ? "md:w-3/5" : "md:w-1/3"} md:shrink-0 border-r border-border-soft flex flex-col min-h-0 ${showDetailMobile ? "hidden md:flex" : "flex"}`}>
                {/* Barre recherche + contrôles */}
                <div className="px-5 py-4 border-b border-border-soft shrink-0 flex flex-col gap-3">
                    <div className="flex items-center gap-2.5 bg-card border border-border-soft rounded-[6px] px-3.5 py-2.5 focus-within:border-accent transition-colors">
                        <IoSearchOutline className="text-text-3 text-[16px]" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                            className="bg-transparent text-[13px] text-text placeholder-text-3 focus:outline-none font-mono w-full" />
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowFilters((v) => !v)}
                            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-[5px] border transition-colors"
                            style={showFilters ? { color: "var(--accent)", borderColor: "var(--accent)" } : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}>
                            <IoFilterOutline className="text-[14px]" /> Filtres
                            <IoChevronDown className={`text-[12px] transition-transform ${showFilters ? "rotate-180" : ""}`} />
                        </button>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            className="flex-1 bg-card border border-border-soft rounded-[5px] px-2.5 py-1.5 text-[11px] text-text focus:outline-none focus:border-accent font-mono">
                            <option value="recent">Plus récentes</option>
                            <option value="oldest">Plus anciennes</option>
                            <option value="company">Entreprise A-Z</option>
                        </select>
                        {/* Tout replier / déplier */}
                        <button onClick={toggleAll} title={allCollapsed ? "Tout déplier" : "Tout replier"}
                            className="shrink-0 flex items-center justify-center px-2 py-1.5 rounded-[5px] border border-border-soft text-text-3 hover:text-accent hover:border-accent transition-colors">
                            <IoLayersOutline className="text-[14px]" />
                        </button>
                        {/* Toggle vue */}
                        <div className="flex items-center rounded-[5px] border border-border-soft overflow-hidden shrink-0">
                            <button onClick={() => setViewMode("list")} className="px-2 py-1.5" style={view === "list" ? { backgroundColor: "var(--accent)", color: "var(--bg)" } : { color: "var(--text-3)" }} title="Liste"><IoListOutline className="text-[14px]" /></button>
                            <button onClick={() => setViewMode("cards")} className="px-2 py-1.5" style={view === "cards" ? { backgroundColor: "var(--accent)", color: "var(--bg)" } : { color: "var(--text-3)" }} title="Grille"><IoGridOutline className="text-[14px]" /></button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setRelanceOnly((v) => !v)} className="text-[10px] uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors"
                                style={relanceOnly ? { color: RELANCE_COLOR, borderColor: RELANCE_COLOR, backgroundColor: `${RELANCE_COLOR}18` } : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}>À relancer</button>
                            <button onClick={() => setFavOnly((v) => !v)} className="flex items-center gap-1 text-[10px] uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors"
                                style={favOnly ? { color: "var(--c3)", borderColor: "var(--c3)", backgroundColor: "var(--c3)18" } : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}><IoStar className="text-[11px]" /> Favoris</button>
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll">
                                <StatusChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Tous</StatusChip>
                                {STATUS_ORDER.map((st) => (
                                    <StatusChip key={st} color={STATUS_META[st]?.color} active={statusFilter === st} onClick={() => setStatusFilter(st)}>{STATUS_META[st]?.label}</StatusChip>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-text-3 uppercase tracking-wider">{sorted.length} candidature{sorted.length > 1 ? "s" : ""}</p>
                </div>

                {/* Contenu : sections repliables */}
                <div className="flex-1 overflow-y-auto custom-scroll min-h-0">
                    {sections.length === 0 && <p className="text-[12px] text-text-3 p-5 text-center">Aucune candidature.</p>}
                    {sections.map((sec) => {
                        const isCol = collapsed[sec.key];
                        return (
                            <div key={sec.key}>
                                <button onClick={() => toggleCollapse(sec.key)}
                                    className="w-full sticky top-0 z-10 bg-bg px-5 py-2 border-b border-border-soft/40 flex items-center gap-2 hover:bg-card/40 transition-colors">
                                    <IoChevronForward className={`text-[11px] transition-transform ${isCol ? "" : "rotate-90"}`} style={{ color: sec.color }} />
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: sec.priority ? sec.color : "var(--text-2)" }}>{sec.label}</span>
                                    <span className="text-[10px] text-text-3">{sec.items.length}</span>
                                </button>
                                {!isCol && (
                                    view === "cards" ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                                            {sec.items.map((a) => (
                                                <ApplicationCard key={a.id} application={a} onSelect={() => openApp(a)} onDelete={onDelete} favorite={isFav(a.id)} onToggleFavorite={onToggleFavorite} highlight={selectedId === a.id} />
                                            ))}
                                        </div>
                                    ) : (
                                        sec.items.map((a) => (
                                            <AppLine key={a.id} app={a} active={selectedId === a.id} onClick={() => openApp(a)} fav={isFav(a.id)} />
                                        ))
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ---- DÉTAIL (droite) ---- */}
            <div className={`flex-1 min-h-0 bg-bg ${showDetailMobile ? "flex flex-col absolute inset-0 md:static md:flex" : "hidden md:block"}`}>
                {!selected ? (
                    <div className="h-full flex items-center justify-center text-text-3 text-[12px]">Sélectionne une candidature.</div>
                ) : (
                    <div className="h-full overflow-y-auto custom-scroll">
                        <ApplicationDetailPanel
                            app={selected}
                            onClose={() => setSelectedId(null)}
                            onRefresh={onRefresh}
                            favorite={isFav(selected.id)}
                            onToggleFavorite={onToggleFavorite}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Ligne compacte pour la vue liste — infos utiles au scan rapide
function AppLine({ app, active, onClick, fav }) {
    const s = STATUS_META[app.status] || {};
    const relance = needsRelance(app);
    return (
        <button onClick={onClick}
            className="w-full text-left px-5 py-3 border-b border-border-soft/40 transition-colors hover:bg-card/50 flex items-center gap-3"
            style={active ? { backgroundColor: "var(--card)", boxShadow: "inset 3px 0 0 0 var(--accent)" } : { boxShadow: `inset 3px 0 0 0 ${relance ? RELANCE_COLOR : "transparent"}` }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "var(--text-3)" }} title={s.label} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-text truncate">{app.company || "—"}</span>
                    {fav && <IoStar className="text-[11px] shrink-0" style={{ color: "var(--c3)" }} />}
                </div>
                <div className="text-[11px] text-text-3 truncate">{app.position || "—"}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {app.salary && <span className="text-[11px] hidden sm:inline" style={{ color: "var(--c2)" }}>{app.salary}</span>}
                {relance && <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[3px]" style={{ color: RELANCE_COLOR, border: `1px solid ${RELANCE_COLOR}66` }}>Relance</span>}
            </div>
        </button>
    );
}

function StatusChip({ active, color, onClick, children }) {
    return (
        <button onClick={onClick} className="shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-1.5 rounded-[5px] border transition-colors"
            style={active
                ? { color: color || "var(--bg)", borderColor: color || "var(--accent)", backgroundColor: color ? `${color}18` : "var(--accent)" }
                : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}>
            {color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
            {children}
        </button>
    );
}

const TYPE_LABELS_D = { alternance: "Alternance", stage: "Stage", cdi: "CDI", cdd: "CDD" };

// Détail candidature — même format compact que OfferDetail, + statut changeable.
function ApplicationDetailPanel({ app, onClose, onRefresh, favorite, onToggleFavorite }) {
    const s = STATUS_META[app.status] || {};
    const relance = needsRelance(app);
    const date = app.applied_at ? new Date(app.applied_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;

    const changeStatus = async (e) => {
        try { await updateApplication(app.id, { status: e.target.value }); await onRefresh?.(); }
        catch (err) { console.error(err); }
    };

    return (
        <div className="px-6 md:px-12 py-10 relative">
            {/* Croix fermer */}
            <button onClick={onClose} title="Fermer" className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-[5px] border border-border-soft text-text-3 hover:text-text hover:border-border transition-colors">
                <IoClose className="text-[17px]" />
            </button>

            {/* En-tête : logo + entreprise + poste + favori */}
            <div className="flex items-start gap-4 mb-5 pr-10">
                <div className="w-16 h-16 rounded-[8px] flex items-center justify-center text-[22px] font-bold shrink-0" style={{ backgroundColor: `${s.color || "var(--accent)"}22`, color: s.color || "var(--accent)" }}>
                    {(app.company || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[20px] font-bold text-text leading-snug truncate">{app.company || "—"}</h2>
                        <button onClick={() => onToggleFavorite?.(app.id)} className="shrink-0">
                            {favorite ? <IoStar className="text-[17px]" style={{ color: "var(--c3)" }} /> : <IoStarOutline className="text-[17px] text-text-3 hover:text-[var(--c3)]" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-text-2 text-[13px]">
                        <IoBriefcaseOutline className="text-text-3" />{app.position || "—"}
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

            {/* Badges infos */}
            <div className="flex flex-wrap gap-2 mb-6">
                {app.type && <BadgeD icon={IoBriefcaseOutline} color="var(--text-2)">{TYPE_LABELS_D[app.type] || app.type}</BadgeD>}
                {app.location && <BadgeD icon={IoLocationOutline} color="var(--c1)">{app.remote ? "Télétravail" : app.location}</BadgeD>}
                {app.salary && <BadgeD icon={IoWalletOutline} color="var(--c2)">{app.salary}</BadgeD>}
                {app.sector && <BadgeD icon={IoBusinessOutline} color="var(--text-2)">{app.sector}</BadgeD>}
                {date && <BadgeD icon={IoCalendarOutline} color="var(--text-3)">{date}</BadgeD>}
            </div>

            {/* Description */}
            {app.description && (
                <div className="mb-6">
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Description</p>
                    <p className="text-[13px] text-text-2 leading-relaxed whitespace-pre-wrap">{app.description}</p>
                </div>
            )}

            {/* Notes */}
            {app.notes && (
                <div className="mb-6">
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Notes</p>
                    <p className="text-[13px] text-text-2 leading-relaxed whitespace-pre-wrap bg-card border border-border-soft rounded-[6px] p-4">{app.notes}</p>
                </div>
            )}

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