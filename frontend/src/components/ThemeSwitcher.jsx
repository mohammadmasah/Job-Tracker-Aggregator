import { useTheme } from "../hooks/useTheme";

// Petit aperçu inline du thème (rendu sous le thème sélectionné)
function ThemePreview() {
    return (
        <div className="px-4 py-3 bg-bg border-b border-border-soft flex items-center gap-3 animate-[preview-in_0.18s_ease-out]">
            <style>{`
                @keyframes preview-in {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            {/* mini carte stat */}
            <div className="bg-panel border border-border-soft rounded-[4px] px-2.5 py-1.5">
                <div className="text-[16px] font-bold text-accent leading-none">16</div>
                <div className="text-[8px] text-text-3 uppercase mt-0.5">Candidatures</div>
            </div>
            {/* badges */}
            <div className="flex flex-col gap-1">
                <span className="text-[8px] text-bg bg-accent px-1.5 py-[2px] rounded-[3px] uppercase tracking-wide font-bold w-fit">
                    ● Lié
                </span>
                <span className="text-[8px] text-text-3 border border-border-soft px-1.5 py-[2px] rounded-[3px] uppercase tracking-wide w-fit">
                    ● Libre
                </span>
            </div>
            {/* texte */}
            <p className="text-[10px] text-text-2 flex-1 leading-snug">
                Texte principal et <span className="text-text-3">secondaire</span>.
            </p>
        </div>
    );
}

export default function ThemeSwitcher() {
    const { theme, setTheme, themes } = useTheme();
    const groups = [...new Set(themes.map((t) => t.group))];

    return (
        <div className="font-mono">
            <div className="max-h-[440px] overflow-y-auto custom-scroll border border-border-soft rounded-[6px] bg-panel">
                {groups.map((group) => (
                    <div key={group}>
                        {/* En-tête de groupe (collant) */}
                        <div className="text-[10px] text-text-3 uppercase tracking-wider px-4 py-2 bg-bg-2 border-b border-border-soft sticky top-0 z-10">
                            {group}
                        </div>

                        {/* Thèmes du groupe */}
                        {themes
                            .filter((t) => t.group === group)
                            .map((t) => {
                                const isActive = theme === t.id;
                                return (
                                    <div key={t.id}>
                                        <button
                                            onClick={() => setTheme(t.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border-soft transition-colors ${isActive ? "bg-card" : "hover:bg-card/50"
                                                }`}
                                        >
                                            {/* Pastille couleur */}
                                            <span
                                                className="w-4 h-4 rounded-full border border-border-soft shrink-0"
                                                style={{ background: t.accent }}
                                            />

                                            <span className={`text-[12px] flex-1 ${isActive ? "text-text" : "text-text-2"}`}>
                                                {t.label}
                                            </span>

                                            {isActive && (
                                                <span className="text-[10px] text-accent uppercase tracking-wide shrink-0">
                                                    ● Actif
                                                </span>
                                            )}
                                        </button>

                                        {/* Aperçu déplié sous le thème sélectionné */}
                                        {isActive && <ThemePreview />}
                                    </div>
                                );
                            })}
                    </div>
                ))}
            </div>
        </div>
    );
}