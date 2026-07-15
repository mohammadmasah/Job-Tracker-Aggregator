import { useMemo } from "react";

// Génère une date factice de candidature (entre aujourd'hui et il y a ~40 jours)
// déterministe par id pour ne pas changer à chaque rendu.
function fakeAppliedAt(id) {
    const daysAgo = (id * 7 + 3) % 40; // pseudo-aléatoire stable
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
}

const DAY = 1000 * 60 * 60 * 24;

// Statuts considérés comme "ayant reçu une réponse"
const RESPONDED = ["interview", "technical_test", "offer", "accepted", "rejected"];

export function useStats(applications = [], contacts = []) {
    return useMemo(() => {
        const now = new Date();
        const total = applications.length;

        // appliedAt factice par candidature
        const withDates = applications.map((a) => ({
            ...a,
            _appliedAt: a.applied_at ? new Date(a.applied_at) : fakeAppliedAt(a.id),
        }));

        // Candidatures cette semaine (7 derniers jours)
        const thisWeek = withDates.filter(
            (a) => (now - a._appliedAt) / DAY <= 7
        ).length;

        // À relancer : postulé (status "applied") depuis +7 jours sans réponse
        const toFollowUp = withDates.filter(
            (a) => a.status === "applied" && (now - a._appliedAt) / DAY > 7
        ).length;

        // Taux de réponse : % de candidatures ayant dépassé "postulé"
        const postulees = withDates.filter(
            (a) => a.status !== "to_apply"
        ).length;
        const responded = withDates.filter((a) =>
            RESPONDED.includes(a.status)
        ).length;
        const responseRate = postulees > 0 ? Math.round((responded / postulees) * 100) : 0;

        // Rythme hebdo : moyenne de candidatures/semaine sur la période couverte
        let weeklyRate = 0;
        if (withDates.length > 0) {
            const oldest = Math.min(...withDates.map((a) => a._appliedAt.getTime()));
            const weeks = Math.max(1, (now.getTime() - oldest) / (DAY * 7));
            weeklyRate = (total / weeks).toFixed(1);
        }

        // Réseau contacts
        const contactsCount = contacts.length;

        return {
            total,
            contactsCount,
            responseRate,
            thisWeek,
            toFollowUp,
            weeklyRate,
        };
    }, [applications, contacts]);
}