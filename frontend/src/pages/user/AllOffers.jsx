import { useState, useEffect, useMemo } from "react";
import {
    IoSearchOutline, IoLocationOutline, IoWalletOutline, IoBriefcaseOutline,
    IoBusinessOutline, IoCalendarOutline, IoCodeSlashOutline, IoArrowBack,
    IoOpenOutline, IoRocketOutline,
} from "react-icons/io5";
import { fetchOffers } from "../../api/offers";

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

export default function AllOffers() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetchOffers();
                setOffers(res.data);
            } catch (e) {
                console.error("Erreur chargement offres", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Sources présentes (pour les filtres, automatique)
    const sources = useMemo(() => {
        const s = new Set(offers.map((o) => o.source).filter(Boolean));
        return [...s];
    }, [offers]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return offers.filter((o) => {
            if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
            if (!q) return true;
            return (
                (o.title || "").toLowerCase().includes(q) ||
                (o.company || "").toLowerCase().includes(q)
            );
        });
    }, [offers, search, sourceFilter]);

    const selected = filtered.find((o) => o.id === selectedId) || filtered[0] || null;

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement des offres...</p>;
    }

    const showDetailMobile = Boolean(selectedId);

    return (
        <div className="h-full bg-bg font-mono flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between px-8 h-[100px] border-b border-border-soft shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase text-text tracking-wide">Toutes les offres</h1>
                    <p className="text-[11px] text-text-3 mt-1">{offers.length} au total</p>
                </div>
            </div>

            {/* MAÎTRE-DÉTAIL */}
            <div className="flex-1 w-full flex min-h-0 py-1">
                {/* LISTE */}
                <div className={`w-full md:w-1/3 md:shrink-0 border-r border-border-soft flex flex-col min-h-0 ${showDetailMobile ? "hidden md:flex" : "flex"}`}>
                    {/* Recherche + filtres source */}
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
                        {sources.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-0.5">
                                <button
                                    onClick={() => setSourceFilter("all")}
                                    className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors shrink-0"
                                    style={sourceFilter === "all"
                                        ? { color: "var(--bg)", backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                                        : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}
                                >
                                    Toutes
                                </button>
                                {sources.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSourceFilter(s)}
                                        className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-[5px] border transition-colors shrink-0"
                                        style={sourceFilter === s
                                            ? { color: "var(--bg)", backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                                            : { color: "var(--text-3)", borderColor: "var(--border-soft)" }}
                                    >
                                        {SOURCE_LABELS[s] || s}
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-text-3 uppercase tracking-wider">
                            {filtered.length} offre{filtered.length > 1 ? "s" : ""}
                        </p>
                    </div>

                    {/* Liste scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scroll min-h-0">
                        {filtered.length === 0 && <p className="text-[12px] text-text-3 p-5 text-center">Aucune offre.</p>}
                        {filtered.map((o) => {
                            const active = selected && o.id === selected.id;
                            const salary = formatSalary(o.salary_min, o.salary_max, o.salary_currency);
                            const places = asArray(o.localisation);
                            const skills = asArray(o.skills);
                            return (
                                <button
                                    key={o.id}
                                    onClick={() => setSelectedId(o.id)}
                                    className="w-full text-left px-5 py-4 border-b border-border-soft/40 transition-colors hover:bg-card/50"
                                    style={active ? { backgroundColor: "var(--card)", boxShadow: "inset 3px 0 0 0 var(--accent)" } : { boxShadow: "inset 3px 0 0 0 transparent" }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-[6px] bg-accent/15 text-accent flex items-center justify-center text-[12px] font-bold shrink-0">
                                            {getInitials(o.company)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13px] font-semibold text-text leading-snug line-clamp-2">{o.title}</div>
                                            <div className="text-[11px] text-text-3 truncate mt-0.5">{o.company}</div>
                                        </div>
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
                                    {o.createdAt && <div className="text-[10px] text-text-3 mt-2">{formatDate(o.createdAt)}</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* DÉTAIL */}
                <div className={`flex-1 overflow-y-auto custom-scroll min-h-0 bg-bg ${showDetailMobile ? "flex flex-col absolute inset-0 md:static md:flex" : "hidden md:block"}`}>
                    {!selected ? (
                        <div className="h-full flex items-center justify-center text-text-3 text-[12px]">Sélectionne une offre.</div>
                    ) : (
                        <OfferDetail offer={selected} onBack={() => setSelectedId(null)} />
                    )}
                </div>
            </div>
        </div>
    );
}

function OfferDetail({ offer, onBack }) {
    const salary = formatSalary(offer.salary_min, offer.salary_max, offer.salary_currency);
    const places = asArray(offer.localisation);
    const skills = asArray(offer.skills);
    const sectors = asArray(offer.sectors);
    const date = formatDate(offer.createdAt);

    return (
        <div className="px-6 md:px-12 w-full py-10">
            {/* Retour mobile */}
            <button onClick={onBack} className="md:hidden flex items-center gap-1.5 text-[12px] text-text-3 hover:text-text mb-5 transition-colors">
                <IoArrowBack className="text-[15px]" /> Retour
            </button>

            {/* En-tête */}
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

            {/* Badges infos */}
            <div className="flex flex-wrap gap-2 mb-6">
                {places[0] && <Badge icon={IoLocationOutline} color="var(--c1)">{places.join(" · ")}</Badge>}
                {salary && <Badge icon={IoWalletOutline} color="#4ade80">{salary}</Badge>}
                {offer.start && <Badge icon={IoRocketOutline} color="var(--c3)">Début : {offer.start}</Badge>}
                {date && <Badge icon={IoCalendarOutline} color="var(--text-3)">{date}</Badge>}
            </div>

            {/* Compétences */}
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

            {/* Secteurs */}
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

            {/* Description */}
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