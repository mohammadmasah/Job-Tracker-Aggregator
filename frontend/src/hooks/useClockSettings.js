import { useSyncExternalStore } from "react";

// Polices disponibles pour l'horloge
// id = suffixe de la classe CSS .clock-font-<id> (dans index.css)
export const CLOCK_FONTS = [
    { id: "audiowide", label: "Audiowide", sample: "21:47" },
    { id: "doto", label: "Doto", sample: "21:47" },
    { id: "wallpoet", label: "Wallpoet", sample: "21:47" },
    { id: "tektur", label: "Tektur", sample: "21:47" },
    { id: "majormono", label: "Major Mono", sample: "21:47" },
    { id: "quantico", label: "Quantico", sample: "21:47" },
    { id: "turret", label: "Turret Road", sample: "21:47" },
    { id: "mono", label: "Plex Mono", sample: "21:47" },
];
const DEFAULTS = {
    format24h: true,
    showSeconds: true,
    showDate: true,
    dateStyle: "long",
    font: "share",
};

const STORAGE_KEY = "trackit-clock";

// ---- Store partagé au niveau du module ----
// Tous les composants lisent CE state unique, donc un changement
// dans Settings re-rend instantanément l'horloge de la navbar.
function load() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch {
        return DEFAULTS;
    }
}

let state = load();
const listeners = new Set();

function emit() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    listeners.forEach((l) => l());
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return state;
}

// ---- Le hook (même API qu'avant) ----
export function useClockSettings() {
    const settings = useSyncExternalStore(subscribe, getSnapshot);

    const toggle = (key) => {
        state = { ...state, [key]: !state[key] };
        emit();
    };

    const setOption = (key, value) => {
        state = { ...state, [key]: value };
        emit();
    };

    return { settings, toggle, setOption, fonts: CLOCK_FONTS };
}