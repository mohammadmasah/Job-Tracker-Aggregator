import { useState, useMemo, useEffect } from "react";
import { activeApplicationStore } from "../../stores/activeApplication";
import {
    IoSearchOutline, IoLocationOutline, IoWalletOutline, IoBusinessOutline,
    IoCalendarOutline, IoCodeSlashOutline, IoArrowBack, IoRocketOutline,
    IoFilterOutline, IoChevronDown, IoCloseCircle, IoClose, IoFlashOutline, IoChevronForward,
} from "react-icons/io5";
import QuickApply from "./QuickApply";
import { markOfferSeen } from "../../api/offers";

// --- helpers ---
function getInitials(name) {
    if (!name) return "?";
    const p = name.trim().split(/\s+/);
    return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function asArray(v) { return Array.isArray(v) ? v : v ? [v] : []; }
function formatDate(iso) {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
}
function formatSalary(min, max, cur) {
    if (!min && !max) return null;
    const c = cur || "€";
    if (min && max) return `${min} - ${max} ${c}`;
    return `${min || max} ${c}`;
}
const SOURCE_LABELS = { welovedevs: "We Love Devs", adzuna: "Adzuna", francetravail: "France Travail" };
const sourceLabel = (s) => SOURCE_LABELS[s] || s || "Autre";

export default function OffersList({ offers }) {
    const [tab, setTab] = useState("all");              // "all" | "unseen"
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);

    // Filtres avancés
    const [showFilters, setShowFilters] = useState(false);
    const [fLocation, setFLocation] = useState("");
    const [fSalaryMin, setFSalaryMin] = useState("");
    const [fSkill, setFSkill] = useState("");
    const [fSector, setFSector] = useState("");
    const [sortBy, setSortBy] = useState("recent");   // recent | salary | company
    const [fSource, setFSource] = useState("all");     // filtre par source
    const [collapsed, setCollapsed] = useState({});    // sections repliées par source
    const [quickApply, setQuickApply] = useState(null);// offre en cours d'application rapide

    // Statut "vue" via backend (champ offer.seen). Set local pour l'affichage immédiat.
    const [seen, setSeen] = useState(() => new Set(offers.filter((o) => o.seen).map((o) => o.id)));
    const markSeen = (id) => {
        setSeen((prev) => new Set(prev).add(id));
        markOfferSeen(id, true).catch(() => { });   // persiste côté backend
    };
    const toggleCollapse = (src) => setCollapsed((c) => ({ ...c, [src]: !c[src] }));

    // Recherche + filtres avancés + tri
    const searched = useMemo(() => {
        const q = search.toLowerCase();
        const loc = fLocation.toLowerCase();
        const skill = fSkill.toLowerCase();
        const sector = fSector.toLowerCase();
        const minSal = fSalaryMin ? Number(fSalaryMin) : null;

        let result = offers.filter((o) => {
            // Source
            if (fSource !== "all" && (o.source || "autre") !== fSource) return false;
            // Recherche texte (titre / entreprise)
            if (q && !(o.title || "").toLowerCase().includes(q) && !(o.company || "").toLowerCase().includes(q)) return false;
            // Localisation
            if (loc) {
                const places = asArray(o.localisation).join(" ").toLowerCase();
                if (!places.includes(loc)) return false;
            }
            // Salaire minimum : on garde si le max (ou le min) de l'offre atteint le seuil
            if (minSal !== null) {
                const offerSal = o.salary_max || o.salary_min || 0;
                if (offerSal < minSal) return false;
            }
            // Compétence
            if (skill) {
                const skills = asArray(o.skills).join(" ").toLowerCase();
                if (!skills.includes(skill)) return false;
            }
            // Secteur
            if (sector) {
                const sectors = asArray(o.sectors).join(" ").toLowerCase();
                if (!sectors.includes(sector)) return false;
            }
            return true;
        });

        // Tri
        result = [...result].sort((a, b) => {
            if (sortBy === "salary") {
                return (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0);
            }
            if (sortBy === "company") {
                return (a.company || "").localeCompare(b.company || "");
            }
            // recent (par défaut) : createdAt décroissant
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        return result;
    }, [offers, search, fLocation, fSalaryMin, fSkill, fSector, sortBy, fSource]);

    const allSources = useMemo(() => [...new Set(offers.map((o) => o.source || "autre"))], [offers]);
    const activeFilterCount = [fLocation, fSalaryMin, fSkill, fSector].filter(Boolean).length + (fSource !== "all" ? 1 : 0);
    const resetFilters = () => { setFLocation(""); setFSalaryMin(""); setFSkill(""); setFSector(""); setFSource("all"); };

    // Compteurs réels
    const unseenList = useMemo(() => searched.filter((o) => !seen.has(o.id)), [searched, seen]);

    // Selon l'onglet : toutes, ou seulement les non vues, groupées par source
    const grouped = useMemo(() => {
        const base = tab === "unseen" ? unseenList : searched;
        const groups = {};
        for (const o of base) {
            const src = o.source || "autre";
            if (!groups[src]) groups[src] = [];
            groups[src].push(o);
        }
        return groups;
    }, [tab, searched, unseenList]);

    const sources = Object.keys(grouped);
    const visibleCount = tab === "unseen" ? unseenList.length : searched.length;

    const selected = searched.find((o) => o.id === selectedId) || null;

    // Focus Poulpie sur l'offre sélectionnée (halo bleu), sinon "en attente"
    useEffect(() => {
        if (selected) activeApplicationStore.setOffer(selected);
        else activeApplicationStore.setWaiting();
        return () => activeApplicationStore.clear();
    }, [selected]);

    const showDetailMobile = Boolean(selectedId);

    const openOffer = (o) => {
        if (selectedId === o.id) { setSelectedId(null); return; }  // re-clic = déselection
        setSelectedId(o.id);
        if (!seen.has(o.id)) markSeen(o.id);   // ouvrir = marquer vue
    };

    return (
        <div className="h-full flex min-h-0 my-5 px-1">
            {/* ---- LISTE ---- */}
            <div className={`w-full md:w-1/3 md:shrink-0 border-r border-border-soft flex flex-col min-h-0 ${showDetailMobile ? "hidden md:flex" : "flex"}`}>
                {/* Recherche + onglets */}
                <div className="px-5 py-4 border-b border-border-soft shrink-0 flex flex-col gap-3">
                    <div className="flex items-center gap-2.5 bg-card border border-border-soft rounded-[6px] px-3.5 py-2.5 focus-within:border-accent transition-colors">
                        <IoSearchOutline className="text-text-3 text-[16px]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher une offre..."
                            className="bg-transparent text-[13px] text-text placeholder-text-3 focus:outline-none font-mono w-full"
                        />
                    </div>

                    {/* Ligne : bouton Filtres + tri */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters((v) => !v)}
                            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-[5px] border transition-colors"
                            style={showFilters || activeFilterCount > 0
                                ? { color: "var(--accent)", borderColor: "var(--accent)", backgroundColor: "var(--card)" }
                                : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}
                        >
                            <IoFilterOutline className="text-[14px]" />
                            Filtres
                            {activeFilterCount > 0 && (
                                <span className="ml-0.5 text-[9px] bg-accent text-bg rounded-full px-1.5 py-0.5 leading-none">{activeFilterCount}</span>
                            )}
                            <IoChevronDown className={`text-[12px] transition-transform ${showFilters ? "rotate-180" : ""}`} />
                        </button>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="flex-1 bg-card border border-border-soft rounded-[5px] px-2.5 py-1.5 text-[11px] text-text focus:outline-none focus:border-accent font-mono"
                        >
                            <option value="recent">Plus récentes</option>
                            <option value="salary">Salaire décroissant</option>
                            <option value="company">Entreprise A-Z</option>
                        </select>
                    </div>

                    {/* Panneau de filtres avancés (déroulant) */}
                    {showFilters && (
                        <div className="flex flex-col gap-2.5 bg-card border border-border-soft rounded-[6px] p-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] uppercase tracking-wider text-text-3">Source</label>
                                <div className="flex flex-wrap gap-1.5">
                                    <SourceChip active={fSource === "all"} onClick={() => setFSource("all")}>Toutes</SourceChip>
                                    {allSources.map((s) => (
                                        <SourceChip key={s} active={fSource === s} onClick={() => setFSource(s)}>{sourceLabel(s)}</SourceChip>
                                    ))}
                                </div>
                            </div>
                            <FilterField label="Localisation" value={fLocation} onChange={setFLocation} placeholder="Paris, Remote..." />
                            <FilterField label="Salaire min (€)" value={fSalaryMin} onChange={setFSalaryMin} placeholder="40000" type="number" />
                            <FilterField label="Compétence" value={fSkill} onChange={setFSkill} placeholder="Python, React..." />
                            <FilterField label="Secteur" value={fSector} onChange={setFSector} placeholder="HealthTech..." />
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={resetFilters}
                                    className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide text-text-3 hover:text-[#f43f5e] transition-colors mt-1"
                                >
                                    <IoCloseCircle className="text-[13px]" /> Réinitialiser
                                </button>
                            )}
                        </div>
                    )}

                    {/* Onglets Toutes / Non vues, avec compteurs réels */}
                    <div className="flex items-center rounded-[5px] border border-border-soft overflow-hidden">
                        <button
                            onClick={() => setTab("all")}
                            className="flex-1 text-[11px] font-semibold uppercase tracking-wide py-2 transition-colors"
                            style={tab === "all" ? { color: "var(--bg)", backgroundColor: "var(--accent)" } : { color: "var(--text-3)" }}
                        >
                            Toutes ({searched.length})
                        </button>
                        <button
                            onClick={() => setTab("unseen")}
                            className="flex-1 text-[11px] font-semibold uppercase tracking-wide py-2 transition-colors border-l border-border-soft"
                            style={tab === "unseen" ? { color: "var(--bg)", backgroundColor: "var(--accent)" } : { color: "var(--text-3)" }}
                        >
                            Non vues ({unseenList.length})
                        </button>
                    </div>
                </div>

                {/* Liste groupée par source */}
                <div className="flex-1 overflow-y-auto custom-scroll min-h-0">
                    {visibleCount === 0 && (
                        <p className="text-[12px] text-text-3 p-5 text-center">
                            {tab === "unseen" ? "Aucune offre non vue." : "Aucune offre."}
                        </p>
                    )}
                    {sources.map((src) => {
                        const isCollapsed = collapsed[src];
                        return (
                            <div key={src}>
                                {/* En-tête de section repliable */}
                                <button onClick={() => toggleCollapse(src)} className="w-full sticky top-0 z-10 bg-bg px-5 py-2 border-b border-border-soft/40 flex items-center gap-2 hover:bg-card/40 transition-colors">
                                    <IoChevronForward className={`text-[11px] text-accent transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent">{sourceLabel(src)}</span>
                                    <span className="text-[10px] text-text-3">{grouped[src].length}</span>
                                </button>

                                {!isCollapsed && grouped[src].map((o) => {
                                    const active = selected && o.id === selected.id;
                                    const isSeen = seen.has(o.id);
                                    const salary = formatSalary(o.salary_min, o.salary_max, o.salary_currency);
                                    const places = asArray(o.localisation);
                                    const skills = asArray(o.skills);
                                    return (
                                        <button
                                            key={o.id}
                                            onClick={() => openOffer(o)}
                                            className="w-full text-left px-5 py-4 border-b border-border-soft/40 transition-colors hover:bg-card/50"
                                            style={active ? { backgroundColor: "var(--card)", boxShadow: "inset 3px 0 0 0 var(--accent)" } : { boxShadow: "inset 3px 0 0 0 transparent" }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-[6px] bg-accent/15 text-accent flex items-center justify-center text-[12px] font-bold shrink-0">
                                                    {getInitials(o.company)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className={`text-[13px] font-semibold leading-snug line-clamp-2 ${isSeen ? "text-text-2" : "text-text"}`}>
                                                        {o.title}
                                                    </div>
                                                    <div className="text-[11px] text-text-3 truncate mt-0.5">{o.company}</div>
                                                </div>
                                                {!isSeen && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" title="Non vue" />}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-text-2">
                                                {places[0] && <span className="flex items-center gap-1"><IoLocationOutline className="text-[12px]" style={{ color: "var(--c1)" }} />{places[0]}</span>}
                                                {salary && <span className="flex items-center gap-1"><IoWalletOutline className="text-[12px]" style={{ color: "#4ade80" }} />{salary}</span>}
                                            </div>
                                            {skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {skills.slice(0, 3).map((sk) => (
                                                        <span key={sk} className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]" style={{ backgroundColor: "var(--card)", color: "var(--text-3)", border: "1px solid var(--border-soft)" }}>{sk}</span>
                                                    ))}
                                                    {skills.length > 3 && <span className="text-[9px] text-text-3 self-center">+{skills.length - 3}</span>}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ---- DÉTAIL ---- */}
            <div className={`flex-1 overflow-y-auto custom-scroll min-h-0 bg-bg ${showDetailMobile ? "flex flex-col absolute inset-0 md:static md:flex" : "hidden md:block"}`}>
                {!selected ? (
                    <div className="h-full flex items-center justify-center text-text-3 text-[12px]">Sélectionne une offre.</div>
                ) : (
                    <OfferDetail offer={selected} onBack={() => setSelectedId(null)} onClose={() => setSelectedId(null)} onApply={() => setQuickApply(selected)} />
                )}
            </div>

            {/* Modal application rapide */}
            {quickApply && (
                <QuickApply
                    offer={quickApply}
                    onClose={() => setQuickApply(null)}
                    onCreated={() => { markSeen(quickApply.id); }}
                />
            )}
        </div>
    );
}

function OfferDetail({ offer, onBack, onClose, onApply }) {
    const salary = formatSalary(offer.salary_min, offer.salary_max, offer.salary_currency);
    const places = asArray(offer.localisation);
    const skills = asArray(offer.skills);
    const sectors = asArray(offer.sectors);
    const date = formatDate(offer.createdAt);

    return (
        <div className="px-6 md:px-12 py-10 relative">
            {/* Croix fermer (desktop) */}
            <button onClick={onClose} title="Fermer" className="hidden md:flex absolute top-5 right-5 w-8 h-8 items-center justify-center rounded-[5px] border border-border-soft text-text-3 hover:text-text hover:border-border transition-colors">
                <IoClose className="text-[17px]" />
            </button>
            <button onClick={onBack} className="md:hidden flex items-center gap-1.5 text-[12px] text-text-3 hover:text-text mb-5 transition-colors">
                <IoArrowBack className="text-[15px]" /> Retour
            </button>

            <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-[8px] bg-accent/15 text-accent flex items-center justify-center text-[22px] font-bold shrink-0">
                    {getInitials(offer.company)}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-[20px] font-bold text-text leading-snug">{offer.title}</h2>
                    <div className="flex items-center gap-1.5 mt-1 text-text-2 text-[13px]">
                        <IoBusinessOutline className="text-text-3" />{offer.company}
                    </div>
                </div>
            </div>

            {/* Application rapide */}
            <button
                onClick={() => {
                    if (offer.url) window.open(offer.url, "_blank", "noopener,noreferrer");
                    onApply();
                }}
                className="flex items-center gap-2 mb-6 text-[12px] font-bold uppercase tracking-wider text-bg bg-accent hover:bg-accent-2 px-4 py-2.5 rounded-[5px] transition-colors"
            >
                <IoFlashOutline className="text-[15px]" /> Appliquer
            </button>

            <div className="flex flex-wrap gap-2 mb-6">
                {places[0] && <Badge icon={IoLocationOutline} color="var(--c1)">{places.join(" · ")}</Badge>}
                {salary && <Badge icon={IoWalletOutline} color="#4ade80">{salary}</Badge>}
                {offer.start && <Badge icon={IoRocketOutline} color="var(--c3)">Début : {offer.start}</Badge>}
                {date && <Badge icon={IoCalendarOutline} color="var(--text-3)">{date}</Badge>}
            </div>

            {skills.length > 0 && (
                <div className="mb-6">
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Compétences</p>
                    <div className="flex flex-wrap gap-1.5">
                        {skills.map((sk) => (
                            <span key={sk} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide px-2 py-1 rounded-[4px]" style={{ backgroundColor: "var(--card)", color: "var(--text-2)", border: "1px solid var(--border-soft)" }}>
                                <IoCodeSlashOutline className="text-[12px] text-accent" />{sk}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {sectors.length > 0 && (
                <div className="mb-6">
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Secteurs</p>
                    <div className="flex flex-wrap gap-1.5">
                        {sectors.map((s) => (
                            <span key={s} className="text-[11px] px-2 py-1 rounded-[4px]" style={{ backgroundColor: "var(--card)", color: "var(--text-2)", border: "1px solid var(--border-soft)" }}>{s}</span>
                        ))}
                    </div>
                </div>
            )}

            {(offer.description || offer.descriptionPreview) && (
                <div className="mb-6">
                    <p className="text-text-3 uppercase text-[10px] tracking-wider mb-2">Description</p>
                    <p className="text-[13px] text-text-2 leading-relaxed whitespace-pre-wrap">
                        {offer.description || offer.descriptionPreview}
                    </p>
                </div>
            )}

            {offer.reference && <p className="text-[10px] text-text-3">Référence : {offer.reference}</p>}
        </div>
    );
}

function Badge({ icon: Icon, color, children }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-[5px]" style={{ backgroundColor: "var(--card)", color: "var(--text-2)", border: "1px solid var(--border-soft)" }}>
            <Icon className="text-[13px]" style={{ color }} />
            {children}
        </span>
    );
}

function FilterField({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-text-3">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-bg border border-border-soft rounded-[4px] px-2.5 py-1.5 text-[11px] text-text placeholder-text-3 focus:outline-none focus:border-accent font-mono"
            />
        </div>
    );
}

function SourceChip({ active, onClick, children }) {
    return (
        <button onClick={onClick}
            className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-[4px] border transition-colors"
            style={active
                ? { color: "var(--bg)", backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}>
            {children}
        </button>
    );
}