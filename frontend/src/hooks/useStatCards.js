import { useState, useEffect } from "react";

// Définition des 6 cartes disponibles.
// key = identifiant, label = titre, icon = nom d'icône (io5), desc = aide
export const STAT_CARDS = [
    { key: "total", label: "Candidatures suivies", icon: "IoBriefcaseOutline", desc: "Nombre total de candidatures" },
    { key: "contactsCount", label: "Réseau contacts", icon: "IoPeopleOutline", desc: "Nombre total de contacts" },
    { key: "responseRate", label: "Taux de réponse", icon: "IoTrendingUpOutline", desc: "% de candidatures ayant reçu une réponse", suffix: "%" },
    { key: "thisWeek", label: "Cette semaine", icon: "IoCalendarOutline", desc: "Candidatures postulées ces 7 derniers jours" },
    { key: "toFollowUp", label: "À relancer", icon: "IoAlarmOutline", desc: "Postulées depuis +7 jours sans réponse" },
    { key: "weeklyRate", label: "Rythme hebdo", icon: "IoSpeedometerOutline", desc: "Moyenne de candidatures par semaine" },
];

// Cartes affichées par défaut
const DEFAULT_VISIBLE = ["total", "contactsCount", "responseRate", "thisWeek"];

const STORAGE_KEY = "trackit-stat-cards";

export function useStatCards() {
    const [visible, setVisible] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
        } catch {
            return DEFAULT_VISIBLE;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    }, [visible]);

    const toggleCard = (key) => {
        setVisible((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const isVisible = (key) => visible.includes(key);

    return { visible, toggleCard, isVisible, allCards: STAT_CARDS };
}