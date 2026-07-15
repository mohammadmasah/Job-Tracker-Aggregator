// Source unique de vérité pour tout ce qui touche aux statuts,
// aux relances et aux couleurs de méthodes de contact.

// --- Statuts ---
export const STATUS_META = {
    to_apply:       { label: "À postuler",     color: "#94a3b8" },
    applied:        { label: "Postulé",        color: "#38bdf8" },
    interview:      { label: "Entretien",      color: "#a855f7" },
    technical_test: { label: "Test technique", color: "#fbbf24" },
    offer:          { label: "Offre",          color: "#e879f9" },
    accepted:       { label: "Acceptée",       color: "#4ade80" },
    rejected:       { label: "Refusée",        color: "#f43f5e" },
};

// Options du filtre (avec "Tous" en tête)
export const STATUS_OPTIONS = [
    { value: "all", label: "Tous" },
    ...Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label })),
];

// Ordre d'affichage des sections
export const STATUS_ORDER = [
    "applied", "interview", "technical_test",
    "rejected", "offer", "accepted", "to_apply",
];

// --- Relance ---
export const RELANCE_DAYS = 7;
export const RELANCE_COLOR = "#f43f5e";

export function daysSince(dateStr) {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function needsRelance(app) {
    return app.status === "applied" && daysSince(app.applied_at) >= RELANCE_DAYS;
}

// --- Couleurs des méthodes de contact ---
export const METHOD_COLORS = {
    email:    "var(--c1)",
    phone:    "var(--c2)",
    linkedin: "var(--c3)",
    other:    "var(--c4)",
};