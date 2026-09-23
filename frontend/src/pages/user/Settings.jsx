import { Navigate, Outlet, useLocation } from "react-router-dom";
import StatCardsConfig from "../../components/stats/StatCardsConfig";
import PageHeader from "../../components/layout/PageHeader";

function SettingsLayout() {
    const location = useLocation();

    if (location.pathname === "/settings") {
        return <Navigate to="/settings/statistiques" replace />;
    }

    return (
        <div className="font-mono min-h-full bg-bg">
            <PageHeader title="Paramètres" description="Gérez votre espace de travail." />

            <div className="px-8 py-6 max-w-xl">
                <Outlet />
            </div>
        </div>
    );
}

function SectionHeader({ label, desc }) {
    return (
        <div className="mb-5">
            <h2 className="text-[13px] font-bold text-text uppercase tracking-wider">{label}</h2>
            <p className="text-[11px] text-text-3 mt-0.5">{desc}</p>
        </div>
    );
}

function SubLabel({ children }) {
    return (
        <p className="text-[10px] font-semibold text-text-2 uppercase tracking-widest mb-2 mt-5 first:mt-0">
            {children}
        </p>
    );
}

export function SettingsStatistiques() {
    return (
        <div className="w-full">
            <SectionHeader
                label="Statistiques"
                desc="Choisis les cartes affichées en haut du tableau de bord."
            />
            <div className="flex gap-30">
                <div>
                    <SubLabel>Rapides</SubLabel>
                    <StatCardsConfig filter="quick" />
                </div>
                <div>
                    <SubLabel>Détaillées</SubLabel>
                    <StatCardsConfig filter="detailed" />
                </div>
            </div>
        </div>
    );
}

export function SettingsNotifications() {
    return (
        <div>
            <SectionHeader
                label="Notifications"
                desc="Alertes et rappels automatiques."
            />
            <div className="font-mono border border-border-soft rounded-[6px] overflow-hidden">
                {[
                    { key: "new_app", label: "Nouvelle candidature ajoutée", desc: "Confirmation à chaque ajout de dossier" },
                    { key: "status", label: "Changement de statut", desc: "Alerte quand un statut est mis à jour" },
                    { key: "followup", label: "Relance recommandée", desc: "Rappel si aucune réponse après 7 jours" },
                    { key: "interview", label: "Entretien à venir", desc: "Rappel 24h avant un entretien planifié" },
                    { key: "weekly", label: "Rapport hebdomadaire", desc: "Résumé envoyé chaque lundi matin" },
                    { key: "anomaly", label: "Anomalie détectée", desc: "Signalement des écarts inhabituels" },
                ].map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center gap-3 px-4 py-3 border-b border-border-soft last:border-b-0 hover:bg-card/50 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="text-[12px] text-text">{item.label}</div>
                            <div className="text-[10px] text-text-3 truncate">{item.desc}</div>
                        </div>
                        <span className="relative w-9 h-5 rounded-full bg-border shrink-0 cursor-pointer">
                            <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-bg transition-all" />
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SettingsLayout;