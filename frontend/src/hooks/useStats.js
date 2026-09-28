import { matchesApplicationFilter } from "../utils/applicationFilters";
import { useMemo } from "react";

const DAY = 1000 * 60 * 60 * 24;

// Statuts considérés comme "ayant reçu une réponse"
const RESPONDED = ["interview", "technical_test", "offer", "accepted", "rejected"];

export function useStats(applications = [], contacts = []) {
    return useMemo(() => {
        const now = new Date();
        const total = applications.length;

        // Dates réelles des candidatures
        const withDates = applications.map((a) => ({
            ...a,
            _appliedAt: a.applied_at ? new Date(a.applied_at) : null,
        }));

        // Candidatures cette semaine (7 derniers jours)
        const thisWeek = withDates.filter(
            (a) => matchesApplicationFilter(a, "week", now.getTime())
        ).length;

        // À relancer : postulé (status "applied") depuis +7 jours sans réponse
        const toFollowUp = withDates.filter(
            (a) => matchesApplicationFilter(a, "follow-up")
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
        const dated = withDates.filter((a) => a._appliedAt && !Number.isNaN(a._appliedAt.getTime()));
        if (dated.length > 0) {
            const oldest = Math.min(...dated.map((a) => a._appliedAt.getTime()));
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