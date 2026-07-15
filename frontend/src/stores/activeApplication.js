// stores/activeApplication.js
// Store partagé (pattern useSyncExternalStore) pour signaler à Poulpie
// quelle candidature l'utilisateur est en train de consulter.

let current = null;
const listeners = new Set();

export const activeApplicationStore = {
    set(app) {
        current = app;
        listeners.forEach((l) => l());
    },
    clear() {
        current = null;
        listeners.forEach((l) => l());
    },
    get() {
        return current;
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};