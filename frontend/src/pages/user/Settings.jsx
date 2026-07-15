import { Navigate, Outlet, useLocation } from "react-router-dom";
import ThemeSwitcher from "../../components/ThemeSwitcher";
import StatCardsConfig from "../../components/StatCardsConfig";
import TodayDate from "../../components/TodayDate";
import { useClockSettings } from "../../hooks/useClockSettings";

function SettingsLayout() {
    const location = useLocation();

    if (location.pathname === "/settings") {
        return <Navigate to="/settings/statistiques" replace />;
    }

    return (
        <div className="font-mono min-h-full bg-bg">
            <div className="px-8 py-8 border-b border-border-soft">
                <h1 className="text-2xl font-extrabold uppercase text-text tracking-wide">Paramètres</h1>
                <p className="text-[11px] text-text-3 mt-1">Personnalise ton espace</p>
            </div>

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

// ============================================================
//  2 CHANGEMENTS dans ton fichier Settings :
//
//  1) Dans SettingsLayout, élargis le conteneur :
//        max-w-xl   ->   max-w-5xl
//     (la ligne : <div className="px-8 py-6 max-w-xl">)
//
//  2) Remplace la fonction SettingsApparence par celle-ci.
// ============================================================

export function SettingsApparence() {
    const { settings, toggle, setOption, fonts } = useClockSettings();

    const optionRow = (label, desc, active, onClick) => (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 border-b border-border-soft last:border-b-0 hover:bg-card/50 transition-colors cursor-pointer"
        >
            <div className="flex-1 min-w-0">
                <div className={`text-[12px] ${active ? "text-text" : "text-text-2"}`}>{label}</div>
                {desc && <div className="text-[10px] text-text-3 truncate">{desc}</div>}
            </div>
            <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${active ? "bg-accent" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg transition-all ${active ? "left-[18px]" : "left-0.5"}`} />
            </span>
        </div>
    );

    return (
        <div>
            <SectionHeader
                label="Apparence"
                desc="Thème de l'application et affichage de l'horloge."
            />

            {/* Deux colonnes : Thème (largeur fixe) | Horloge (reste) */}
            <div className="flex gap-10 items-start">
                {/* ---- COLONNE THÈME (largeur fixe) ---- */}
                <div className="w-full shrink-0">
                    <SubLabel>Thème</SubLabel>
                    <ThemeSwitcher />
                </div>

                {/* ---- COLONNE HORLOGE ---- */}
                <div className="flex-1 min-w-[280px]">
                    <SubLabel>Horloge</SubLabel>

                    {/* Choix de police */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {fonts.map((f) => {
                            const active = settings.font === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setOption("font", f.id)}
                                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-[5px] border transition-colors ${active ? "border-accent bg-card" : "border-border-soft bg-panel hover:border-border"}`}
                                >
                                    <span className={`text-[18px] leading-none tabular-nums clock-font-${f.id} ${active ? "text-accent" : "text-text"}`}>
                                        {f.sample}
                                    </span>
                                    <span className="text-[10px] text-text-3">{f.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Options d'affichage */}
                    <div className="border border-border-soft rounded-[6px] overflow-hidden">
                        {optionRow(
                            "Format 24 heures",
                            settings.format24h ? "14:30" : "02:30 PM",
                            settings.format24h,
                            () => toggle("format24h")
                        )}
                        {optionRow("Afficher les secondes", null, settings.showSeconds, () => toggle("showSeconds"))}
                        {optionRow("Afficher la date", null, settings.showDate, () => toggle("showDate"))}

                        {settings.showDate && (
                            <div className="flex items-center gap-3 px-4 py-3 border-t border-border-soft">
                                <div className="flex-1">
                                    <div className="text-[12px] text-text">Style de date</div>
                                    <div className="text-[10px] text-text-3">Format d'affichage</div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    {["long", "short"].map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => setOption("dateStyle", style)}
                                            className={`text-[10px] px-3 py-1.5 rounded-[4px] border transition-colors ${settings.dateStyle === style
                                                ? "text-bg bg-accent border-accent"
                                                : "text-text-2 bg-panel border-border-soft hover:border-border"
                                                }`}
                                        >
                                            {style === "long" ? "Long" : "Court"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsLayout;