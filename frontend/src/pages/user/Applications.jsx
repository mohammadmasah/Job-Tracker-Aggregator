import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { IoGridOutline, IoListOutline, IoStar } from "react-icons/io5";
import { useApplications } from "../../hooks/useApplications";
import { useContacts } from "../../hooks/useContacts";
import ApplicationForm from "../../components/ApplicationForm";
import { createApplication } from "../../api/application";
import ApplicationCard from "../../components/ApplicationCard";
import ApplicationRow from "../../components/ApplicationRow";
import { createContact } from "../../api/contacts";
import { createContactMethod } from "../../api/contactMethod";
import { uploadDocument } from "../../api/document";
import ApplicationDetail from "../../components/ApplicationDetail";
import { STATUS_OPTIONS, STATUS_ORDER, STATUS_META, RELANCE_COLOR, needsRelance } from "../../constants/status";

const CARD_GRID = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";

export default function Applications() {
    const { applications, loading, removeApplication, fetchApplications } = useApplications();
    const { contacts } = useContacts();

    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);

    // --- Filtres ---
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [relanceOnly, setRelanceOnly] = useState(false);
    const [favOnly, setFavOnly] = useState(false);

    // --- Vue (cartes / liste), persistée ---
    const [view, setView] = useState(() => localStorage.getItem("app-view") || "cards");
    const setViewMode = (v) => { setView(v); localStorage.setItem("app-view", v); };

    // --- Favoris (localStorage) ---
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem("favorites");
        return saved ? JSON.parse(saved) : [];
    });
    const toggleFavorite = (id) => {
        setFavorites((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            localStorage.setItem("favorites", JSON.stringify(next));
            return next;
        });
    };
    const isFav = (id) => favorites.includes(id);

    // --- Sections (état d'ouverture persisté) ---
    const [openSections, setOpenSections] = useState(() => {
        const saved = localStorage.getItem("open-sections");
        return saved ? JSON.parse(saved) : {};
    });
    const toggleSection = (key) => {
        setOpenSections((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            localStorage.setItem("open-sections", JSON.stringify(next));
            return next;
        });
    };

    // --- Tout replier / tout déplier ---
    const ALL_KEYS = ["relance", ...STATUS_ORDER];
    const allClosed = ALL_KEYS.every((k) => !openSections[k]);
    const toggleAll = () => {
        const next = {};
        ALL_KEYS.forEach((k) => { next[k] = allClosed; });
        setOpenSections(next);
        localStorage.setItem("open-sections", JSON.stringify(next));
    };

    // --- Réf du conteneur scrollable ---
    const scrollRef = useRef(null);

    // Ouverture auto d'une candidature via ?open=<id> (lien depuis un contact)
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const openId = searchParams.get("open");
        if (openId && applications.length > 0) {
            const app = applications.find((a) => String(a.id) === String(openId));
            if (app) {
                setSelectedApp(app);
                // nettoie l'URL pour ne pas rouvrir à chaque render
                searchParams.delete("open");
                setSearchParams(searchParams, { replace: true });
            }
        }
    }, [applications, searchParams]);

    const detectType = (value) => {
        if (value.includes("@")) return "email";
        if (/^[\d\s+]+$/.test(value)) return "phone";
        if (value.includes("linkedin")) return "linkedin";
        return "other";
    };

    const handleCreate = async (data) => {
        const res = await createApplication(data.application);
        const applicationId = res.data.id;
        for (const contact of data.contacts) {
            const contactRes = await createContact({ name: contact.name, application_id: applicationId });
            const contactId = contactRes.data.id;
            for (const info of contact.infos.filter((i) => i.trim())) {
                await createContactMethod(contactId, { type: detectType(info), value: info });
            }
        }
        for (const file of data.files || []) {
            await uploadDocument(applicationId, file);
        }
        await fetchApplications();
        setIsAddFormOpen(false);
    };

    // --- Filtrage + tri ---
    const filtered = applications
        .filter((app) => statusFilter === "all" || app.status === statusFilter)
        .filter((app) =>
            search === "" ||
            app.company.toLowerCase().includes(search.toLowerCase()) ||
            app.position.toLowerCase().includes(search.toLowerCase())
        )
        .filter((app) => !relanceOnly || needsRelance(app))
        .filter((app) => !favOnly || isFav(app.id));

    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "recent") return new Date(b.applied_at) - new Date(a.applied_at);
        if (sortBy === "oldest") return new Date(a.applied_at) - new Date(b.applied_at);
        if (sortBy === "company") return a.company.localeCompare(b.company);
        return 0;
    });

    const relances = sorted.filter(needsRelance);

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    const selectClass = "bg-card border border-border-soft rounded-[4px] px-3 py-1.5 text-[12px] text-text focus:outline-none focus:border-accent font-mono";

    const renderItems = (items) =>
        view === "cards" ? (
            <div className={CARD_GRID}>
                {items.map((app) => (
                    <ApplicationCard key={app.id} application={app} onDelete={removeApplication} onSelect={() => setSelectedApp(app)} favorite={isFav(app.id)} onToggleFavorite={toggleFavorite} />
                ))}
            </div>
        ) : (
            <div className="flex flex-col gap-1.5">
                {items.map((app) => (
                    <ApplicationRow key={app.id} application={app} onDelete={removeApplication} onSelect={() => setSelectedApp(app)} favorite={isFav(app.id)} onToggleFavorite={toggleFavorite} />
                ))}
            </div>
        );

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto custom-scroll bg-bg font-mono">
            {/* HEADER */}
            <div className="flex justify-between h-[100px] border-b border-border-soft items-center px-8">
                <div>
                <h1 className="font-extrabold text-2xl uppercase text-text tracking-wide">Mes candidatures</h1>
                <p className="text-[11px] text-text-3 mt-1">{applications.length} au total</p>
                </div>
                <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="px-5 py-2.5 text-[11px] font-bold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase rounded-[4px] transition-colors"
                >
                    + Nouvelle candidature
                </button>
            </div>

            {/* MODAL création */}
            {isAddFormOpen && (
                <div className="fixed inset-0 bg-bg/90 flex items-center justify-center z-50">
                    <div className="bg-panel border border-border rounded-[6px] w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scroll">
                        <div className="p-6">
                            <ApplicationForm onSubmit={handleCreate} onCancel={() => setIsAddFormOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* BARRE DE FILTRES */}
            <div className="flex flex-col gap-3 px-8 pt-6">
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text" placeholder="Rechercher..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className={selectClass}
                    />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
                        <option value="recent">Plus récentes</option>
                        <option value="oldest">Plus anciennes</option>
                        <option value="company">Entreprise A-Z</option>
                    </select>

                    <label className="flex items-center gap-2 text-[12px] text-text cursor-pointer">
                        <span className="relative flex items-center justify-center">
                            <input
                                type="checkbox" checked={relanceOnly}
                                onChange={(e) => setRelanceOnly(e.target.checked)}
                                className="appearance-none w-4 h-4 border rounded-[3px] cursor-pointer transition-colors"
                                style={{ borderColor: relanceOnly ? RELANCE_COLOR : "var(--border)", backgroundColor: relanceOnly ? RELANCE_COLOR : "transparent" }}
                            />
                            {relanceOnly && <span className="absolute text-white text-[10px] font-bold pointer-events-none">✓</span>}
                        </span>
                        À relancer
                    </label>

                    <button
                        onClick={() => setFavOnly((v) => !v)}
                        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] border transition-colors"
                        style={favOnly
                            ? { color: "#fbbf24", borderColor: "#fbbf24", backgroundColor: "#fbbf2415" }
                            : { color: "var(--text-3)", borderColor: "var(--border-soft)", backgroundColor: "transparent" }}
                    >
                        <IoStar className="text-[13px]" />
                        Favoris
                    </button>

                    {/* Bascule vue */}
                    <div className="flex items-center rounded-[4px] border border-border-soft overflow-hidden">
                        <button
                            onClick={() => setViewMode("cards")}
                            className="px-2.5 py-1.5 transition-colors"
                            style={view === "cards" ? { backgroundColor: "var(--accent)", color: "var(--bg)" } : { color: "var(--text-3)" }}
                            title="Vue cartes"
                        >
                            <IoGridOutline className="text-[15px]" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className="px-2.5 py-1.5 transition-colors"
                            style={view === "list" ? { backgroundColor: "var(--accent)", color: "var(--bg)" } : { color: "var(--text-3)" }}
                            title="Vue liste"
                        >
                            <IoListOutline className="text-[15px]" />
                        </button>
                    </div>

                    {/* Tout replier / déplier */}
                    <button
                        onClick={toggleAll}
                        className="text-[11px] px-3 py-1.5 rounded-[4px] border border-border-soft text-text-3 hover:text-text hover:border-border transition-colors"
                    >
                        {allClosed ? "Tout déplier" : "Tout replier"}
                    </button>

                    <span className="text-[11px] text-text-3 ml-auto">
                        {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {STATUS_OPTIONS.map((o) => {
                        const isActive = statusFilter === o.value;
                        const color = STATUS_META[o.value]?.color;
                        return (
                            <button
                                key={o.value}
                                onClick={() => setStatusFilter(o.value)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-[4px] border transition-colors"
                                style={isActive
                                    ? { backgroundColor: color ? `${color}22` : "var(--accent)", borderColor: color || "var(--accent)", color: color || "var(--bg)" }
                                    : { backgroundColor: "transparent", borderColor: "var(--border-soft)", color: "var(--text-3)" }}
                            >
                                {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* CONTENU */}
            <div className="px-8 py-6 flex flex-col gap-6">
                {sorted.length === 0 ? (
                    <p className="text-text-3 text-[12px]">Aucune candidature ne correspond.</p>
                ) : statusFilter === "all" ? (
                    <>
                        {relances.length > 0 && (
                            <Section title="⚠ À relancer" color={RELANCE_COLOR} count={`${relances.length} sans réponse`} isPriority collapsed={!openSections["relance"]} onToggle={() => toggleSection("relance")}>
                                {renderItems(relances)}
                            </Section>
                        )}
                        {STATUS_ORDER.map((status) => {
                            const group = sorted.filter((app) => app.status === status);
                            if (group.length === 0) return null;
                            const meta = STATUS_META[status];
                            return (
                                <Section key={status} title={meta.label} color={meta.color} count={group.length} collapsed={!openSections[status]} onToggle={() => toggleSection(status)}>
                                    {renderItems(group)}
                                </Section>
                            );
                        })}
                    </>
                ) : (
                    renderItems(sorted)
                )}
            </div>

            {selectedApp && (
                <ApplicationDetail
                    application={selectedApp}
                    onClose={() => setSelectedApp(null)}
                    onDelete={(id) => { removeApplication(id); setSelectedApp(null); }}
                    onRefresh={fetchApplications}
                    favorite={isFav(selectedApp.id)}
                    onToggleFavorite={toggleFavorite}
                />
            )}

            <ScrollToTop scrollRef={scrollRef} />
        </div>
    );
}

function Section({ title, color, count, collapsed, onToggle, isPriority, children }) {
    return (
        <div className="flex flex-col rounded-[4px] overflow-hidden" style={isPriority ? { border: `1px solid ${RELANCE_COLOR}44`, backgroundColor: `${RELANCE_COLOR}0a` } : {}}>
            <button onClick={onToggle} className="flex items-center gap-2 px-3 py-2.5 hover:bg-panel/50 transition-colors text-left">
                <span className="text-text-3 transition-transform shrink-0" style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}>▼</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color }}>{title}</h3>
                <span className="text-[11px] text-text-3">{count}</span>
                {isPriority && (
                    <span className="ml-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-[3px]" style={{ backgroundColor: `${RELANCE_COLOR}22`, color: RELANCE_COLOR }}>
                        Priorité
                    </span>
                )}
            </button>
            {!collapsed && <div className="p-3 pt-1">{children}</div>}
        </div>
    );
}

function ScrollToTop({ scrollRef }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => setShow(el.scrollTop > 400);
        el.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => el.removeEventListener("scroll", onScroll);
    }, [scrollRef]);

    return (
        <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className={`fixed bottom-24 right-6 z-40 w-11 h-11 flex items-center justify-center bg-panel border border-border rounded-full text-text hover:border-accent hover:text-accent transition-all shadow-lg ${show ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            title="Retour en haut"
            aria-label="Retour en haut"
        >
            ↑
        </button>
    );
}