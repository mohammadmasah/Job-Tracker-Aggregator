// stores/activeApplication.js
// Store partagé (useSyncExternalStore) pour indiquer à Poulpie son "focus".
// Deux types de focus, avec couleurs de halo distinctes :
//   - "application" → une candidature (halo accent)
//   - "contact"     → un contact        (halo couleur c3)
//
// RÉTROCOMPAT : get() renvoie toujours les données brutes (l'app ou le contact),
// donc le code existant (activeApp.company, .position, .status...) continue de marcher.

let data = null;      // les données brutes (app ou contact)
let kind = null;      // "application" | "contact" | null
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

const FOCUS_COLORS = {
    application: "var(--accent)",
    contact: "var(--c3)",       // contact = orange ambré
    offer: "var(--c1)",         // offre = bleu
    waiting: "var(--text-3)",   // focus léger "en attente" (gris doux)
};

export const activeApplicationStore = {
    // set(app) sans type = candidature (rétrocompat avec ApplicationDetail existant)
    set(value, focusKind = "application") {
        data = value || null;
        kind = value ? focusKind : null;
        notify();
    },
    setApplication(app) {
        data = app || null;
        kind = app ? "application" : null;
        notify();
    },
    setContact(contact) {
        data = contact || null;
        kind = contact ? "contact" : null;
        notify();
    },
    setOffer(offer) {
        data = offer || null;
        kind = offer ? "offer" : null;
        notify();
    },
    // Focus léger "en attente" : pas de données précises, halo doux
    setWaiting() {
        data = null;
        kind = "waiting";
        notify();
    },
    clear() {
        data = null;
        kind = null;
        notify();
    },
    // Données brutes (ce que lit ChatWidget aujourd'hui)
    get() {
        return data;
    },
    // Type de focus courant
    getKind() {
        return kind;
    },
    // Couleur de halo selon le type
    getColor() {
        return kind ? (FOCUS_COLORS[kind] || "var(--accent)") : "var(--border)";
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};