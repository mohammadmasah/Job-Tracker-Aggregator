export const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-2 disabled:opacity-50 disabled:cursor-not-allowed';
export const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-border-soft bg-panel px-4 py-2.5 text-sm text-text-2 hover:border-accent disabled:opacity-50';
export const field = 'mt-2 w-full rounded-xl border border-border-soft bg-panel p-3 text-sm text-text focus:border-accent focus:outline-none';
export const statusLabel = status => ({ ready: 'À préparer', practicing: 'En cours', review: 'Bilan à générer', completed: 'Terminée' }[status] || status);
export const dateLabel = date => new Date(date.endsWith('Z') ? date : `${date}Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

