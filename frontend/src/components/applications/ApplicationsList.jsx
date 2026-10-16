import DeleteButton from "../common/DeleteButton";
import { useSearchParams } from "react-router-dom";
import { matchesApplicationFilter } from "../../utils/applicationFilters";
import { useState, useMemo, useEffect, useRef } from "react";
import {
    IoSearchOutline, IoStar, IoGridOutline, IoListOutline,
    IoBriefcaseOutline, IoChevronForward, IoFilterOutline, IoChevronDown, IoLayersOutline,
} from "react-icons/io5";
import { STATUS_META, STATUS_ORDER, RELANCE_COLOR, needsRelance } from "../../constants/status";
import ApplicationDetail from "./ApplicationDetail";
import { activeApplicationStore } from "../../stores/activeApplication";
import ApplicationCard from "./ApplicationCard";


export default function ApplicationsList({ applications = [], onRefresh, onDelete, favorites, onToggleFavorite }) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [searchParams, setSearchParams] = useSearchParams();
    const statusFilter = STATUS_ORDER.includes(searchParams.get("status")) ? searchParams.get("status") : "all";
    const selectedId = Number(searchParams.get("open")) || null;
    const filter = searchParams.get("filter") || "";
    const updateParam = (key, value) => setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
        return next;
    });
    const setSelectedId = (id) => updateParam("open", id);
    const setStatusFilter = (status) => { setCollapsed({}); updateParam("status", status); };
    const [view, setView] = useState(() => localStorage.getItem("app-view") || "list");
    const [collapsed, setCollapsed] = useState({});
    const [showFilters, setShowFilters] = useState(statusFilter !== "all" || Boolean(filter));
    const relanceOnly = filter === "follow-up";
    const setRelanceOnly = () => { setCollapsed({}); updateParam("filter", relanceOnly ? "" : "follow-up"); };
    const [favOnly, setFavOnly] = useState(false);

    const isFav = (id) => favorites?.includes?.(id);
    const setViewMode = (v) => { setView(v); localStorage.setItem("app-view", v); };
    const toggleCollapse = (k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

    // Filtrage + tri
    const sorted = useMemo(() => {
        const q = search.toLowerCase();
        let r = applications.filter((a) =>
            (statusFilter === "all" || a.status === statusFilter) &&
            matchesApplicationFilter(a, filter) &&
            (!q || (a.company || "").toLowerCase().includes(q) || (a.position || "").toLowerCase().includes(q)) &&
            (!relanceOnly || needsRelance(a)) &&
            (!favOnly || favorites?.includes(a.id))
        );
        return [...r].sort((a, b) => {
            if (sortBy === "recent") return new Date(b.applied_at || 0) - new Date(a.applied_at || 0);
            if (sortBy === "oldest") return new Date(a.applied_at || 0) - new Date(b.applied_at || 0);
            if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
            return 0;
        });
    }, [applications, search, sortBy, statusFilter, relanceOnly, favOnly, favorites, filter]);

    const pageSize = 12;
    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const criteria = JSON.stringify([search, sortBy, statusFilter, filter, favOnly]);
    const [pagination, setPagination] = useState({ criteria, page: 1 });
    const page = pagination.criteria === criteria ? Math.min(pagination.page, pageCount) : 1;
    // Reset for new filters and clamp after deleting the last card on a page.
    if (pagination.criteria !== criteria || pagination.page !== page) {
        setPagination({ criteria, page });
    }
    const cards = sorted.slice((page - 1) * pageSize, page * pageSize);
    const cardScroll = useRef(null);
    const changePage = next => {
        setPagination({ criteria, page: next });
        cardScroll.current?.scrollTo({ top: 0 });
    };

    const relances = useMemo(() => sorted.filter(needsRelance), [sorted]);
    const selected = applications.find((a) => a.id === selectedId) || null;
    const showDetailMobile = Boolean(selected);

    // Focus Poulpie sur la candidature ouverte (halo accent), sinon en attente
    useEffect(() => {
        if (selected) activeApplicationStore.setApplication(selected);
        else activeApplicationStore.setWaiting();
        return () => activeApplicationStore.clear();
    }, [selected]);

    const openApp = (a) => setSelectedId(selectedId === a.id ? null : a.id);

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

    const allCollapsed = sectionKeys.length > 0 && sectionKeys.every((k) => collapsed[k]);
    const toggleAll = () => {
        const v = !allCollapsed;
        const next = {};
        sectionKeys.forEach((k) => (next[k] = v));
        setCollapsed(next);
    };

    return (
        <div className={`grid items-start gap-5 ${view === "list" ? "xl:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]" : ""}`}>
            {/* ---- LISTE (gauche) ---- */}
            <div className={`min-w-0 overflow-hidden rounded-xl border border-border-soft bg-panel flex flex-col ${showDetailMobile ? (view === "cards" ? "hidden" : "hidden xl:flex") : "flex"}`}>
                {/* Barre recherche + contrôles */}
                <div className="px-5 py-4 border-b border-border-soft shrink-0 flex flex-col gap-3">
                    <div className="flex items-center gap-2.5 bg-card border border-border-soft rounded-[6px] px-3.5 py-2.5 focus-within:border-accent transition-colors">
                        <IoSearchOutline className="text-text-2 text-[16px]" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher une candidature" placeholder="Entreprise ou poste…"
                            className="bg-transparent text-[13px] text-text placeholder-text-3 focus:outline-none font-mono w-full" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}
                            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[5px] border transition-colors"
                            style={showFilters ? { color: "var(--accent)", borderColor: "var(--accent)" } : { color: "var(--text-2)", borderColor: "var(--border-soft)" }}>
                            <IoFilterOutline className="text-[14px]" /> Filtres
                            <IoChevronDown className={`text-sm transition-transform ${showFilters ? "rotate-180" : ""}`} />
                        </button>
                        <select aria-label="Trier les candidatures" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            className="flex-1 bg-card border border-border-soft rounded-[5px] px-2.5 py-1.5 text-sm text-text focus:outline-none focus:border-accent font-mono">
                            <option value="recent">Plus récentes</option>
                            <option value="oldest">Plus anciennes</option>
                            <option value="company">Entreprise A-Z</option>
                        </select>
                        {/* Tout replier / déplier */}
                        <button hidden={view === "cards"} onClick={toggleAll} title={allCollapsed ? "Tout déplier" : "Tout replier"}
                            className="shrink-0 flex items-center justify-center px-2 py-1.5 rounded-[5px] border border-border-soft text-text-2 hover:text-accent hover:border-accent transition-colors">
                            <IoLayersOutline className="text-[14px]" />
                        </button>
                        {/* Toggle vue */}
                        <div className="flex items-center rounded-[5px] border border-border-soft overflow-hidden shrink-0">
                            <button onClick={() => setViewMode("list")} className="px-2 py-1.5" style={view === "list" ? { backgroundColor: "var(--accent)", color: "var(--bg)" } : { color: "var(--text-2)" }} title="Liste"><IoListOutline className="text-[14px]" /></button>
                            <button onClick={() => setViewMode("cards")} className="px-2 py-1.5" style={view === "cards" ? { backgroundColor: "var(--accent)", color: "var(--bg)" } : { color: "var(--text-2)" }} title="Grille"><IoGridOutline className="text-[14px]" /></button>
                        </div>
                    </div>

                    {filter && filter !== "follow-up" && (
                        <button onClick={() => updateParam("filter", "")} className="text-left text-xs text-accent">
                            {filter === "week" ? "Ces 7 derniers jours" : "Réponse reçue"} × Effacer
                        </button>
                    )}
                    {showFilters && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setRelanceOnly((v) => !v)} className="text-xs uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors"
                                style={relanceOnly ? { color: RELANCE_COLOR, borderColor: RELANCE_COLOR, backgroundColor: `${RELANCE_COLOR}18` } : { color: "var(--text-2)", borderColor: "var(--border-soft)" }}>À relancer</button>
                            <button onClick={() => setFavOnly((v) => !v)} className="flex items-center gap-1 text-xs uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors"
                                style={favOnly ? { color: "var(--c3)", borderColor: "var(--c3)", backgroundColor: "var(--card)" } : { color: "var(--text-2)", borderColor: "var(--border-soft)" }}><IoStar className="text-sm" /> Favoris</button>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <StatusChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Tous</StatusChip>
                                {STATUS_ORDER.map((st) => (
                                    <StatusChip key={st} color={STATUS_META[st]?.color} active={statusFilter === st} onClick={() => setStatusFilter(st)}>{STATUS_META[st]?.label}</StatusChip>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-text-2 uppercase tracking-wider">{sorted.length} candidature{sorted.length > 1 ? "s" : ""}</p>
                </div>

                {/* Contenu : sections repliables */}
                <div ref={cardScroll} className="max-h-[72vh] overflow-y-auto custom-scroll">
                    {sections.length === 0 && <p className="text-sm text-text-2 p-5 text-center">Aucune candidature.</p>}
                    {view === "cards" ? <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
                        {cards.map(a => <ApplicationCard key={a.id} application={a} onSelect={() => openApp(a)} onDelete={onDelete} favorite={isFav(a.id)} onToggleFavorite={onToggleFavorite} />)}
                    </div> : sections.map((sec) => {
                        const isCol = collapsed[sec.key];
                        return (
                            <div key={sec.key}>
                                <button onClick={() => toggleCollapse(sec.key)}
                                    className="w-full sticky top-0 z-10 bg-bg px-5 py-2 border-b border-border-soft flex items-center gap-2 hover:bg-card transition-colors">
                                    <IoChevronForward className={`text-sm transition-transform ${isCol ? "" : "rotate-90"}`} style={{ color: sec.color }} />
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                                    <span className="text-sm font-bold uppercase tracking-wider" style={{ color: sec.priority ? sec.color : "var(--text-2)" }}>{sec.label}</span>
                                    <span className="text-xs text-text-2">{sec.items.length}</span>
                                </button>
                                {!isCol && sec.items.map(a => <AppLine key={a.id} onDelete={() => onDelete(a.id)} app={a} active={selectedId === a.id} onClick={() => openApp(a)} fav={isFav(a.id)} />)}
                            </div>
                        );
                    })}
                </div>
                {view === "cards" && sorted.length > 0 && <nav aria-label="Pagination des candidatures" className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft bg-panel px-5 py-4">
                    <p aria-live="polite" className="text-sm text-text-2">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} sur {sorted.length}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} className="rounded-lg border border-border-soft px-3 py-2 text-sm text-text-2 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40">Précédent</button>
                        {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button type="button" key={number} aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => changePage(number)} className={`size-9 rounded-lg border text-sm ${number === page ? "border-accent bg-accent/10 font-bold text-accent" : "border-border-soft text-text-2 hover:bg-card"}`}>{number}</button>)}
                        <button type="button" disabled={page === pageCount} onClick={() => changePage(page + 1)} className="rounded-lg border border-border-soft px-3 py-2 text-sm text-text-2 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40">Suivant</button>
                    </div>
                </nav>}
            </div>

            {/* ---- DÉTAIL (droite) ---- */}
            <div className={`min-w-0 rounded-xl border border-border-soft bg-panel ${showDetailMobile ? "block" : view === "cards" ? "hidden" : "hidden xl:block"}`}>
                {!selected ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center"><IoBriefcaseOutline className="text-4xl text-accent" /><h2 className="text-lg font-bold text-text">Ta candidature, en un coup d’œil</h2><p className="max-w-sm text-sm leading-relaxed text-text-2">Sélectionne une entreprise pour retrouver le poste, son statut, tes contacts et tes documents.</p></div>
                ) : (
                    <div className="xl:max-h-[calc(100vh-160px)] overflow-y-auto custom-scroll">
                        <ApplicationDetail
                            key={selected.id}
                            app={selected} applications={applications}
                            onDelete={onDelete}
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
function AppLine({ app, active, onClick, fav, onDelete }) {
    const s = STATUS_META[app.status] || {};
    const relance = needsRelance(app);
    return (
        <div className="flex items-center gap-2 pr-3 border-b border-border-soft">
        <button onClick={onClick}
            className="min-w-0 flex-1 text-left px-4 py-4 transition-colors hover:bg-card flex items-center gap-3"
            style={active ? { backgroundColor: "var(--card)", boxShadow: "inset 3px 0 0 0 var(--accent)" } : { boxShadow: `inset 3px 0 0 0 ${relance ? RELANCE_COLOR : "transparent"}` }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "var(--text-2)" }} title={s.label} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-text truncate">{app.company || "—"}</span>
                    {fav && <IoStar className="text-sm shrink-0" style={{ color: "var(--c3)" }} />}
                </div>
                <div className="text-sm text-text-2 line-clamp-2 leading-relaxed">{app.position || "—"}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">

                {relance && <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded-[3px]" style={{ color: RELANCE_COLOR, border: `1px solid ${RELANCE_COLOR}66` }}>Relance</span>}
            </div>
        </button>
        <DeleteButton compact label={`la candidature « ${app.position} — ${app.company} » et ses documents`} onDelete={onDelete} />
        </div>
    );
}

function StatusChip({ active, color, onClick, children }) {
    return (
        <button onClick={onClick} className="shrink-0 flex items-center gap-1 text-xs uppercase tracking-wide px-2 py-1.5 rounded-[5px] border transition-colors"
            style={active
                ? { color: color || "var(--bg)", borderColor: color || "var(--accent)", backgroundColor: color ? `${color}18` : "var(--accent)" }
                : { color: "var(--text-2)", borderColor: "var(--border-soft)" }}>
            {color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
            {children}
        </button>
    );
}
