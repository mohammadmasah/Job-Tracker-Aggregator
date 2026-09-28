import { needsRelance } from '../constants/status.js';

export function matchesApplicationFilter(application, filter, now = Date.now()) {
    if (filter === 'follow-up') return needsRelance(application);
    if (filter === 'responded') return ['interview', 'technical_test', 'offer', 'accepted', 'rejected'].includes(application.status);
    if (filter === 'week') {
        if (!application.applied_at) return false;
        const age = now - new Date(application.applied_at).getTime();
        return age >= 0 && age <= 7 * 86400000;
    }
    return true;
}
