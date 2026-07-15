import { useState, useEffect } from "react";

// Tous les thèmes (id = classe .theme-* du CSS)
// accent = couleur de pastille dans le sélecteur
// Ordre : Sombres (mono -> multi) -> Clairs (mono -> multi) -> Vifs -> Spéciaux
export const THEMES = [
    // ---- SOMBRES MONOCHROMES ----
    { id: "blue", label: "Bleu nuit", group: "Sombres monochromes", accent: "#d6dde8" },
    { id: "violet", label: "Violet nuit", group: "Sombres monochromes", accent: "#b794f6" },
    { id: "oled", label: "Noir OLED", group: "Sombres monochromes", accent: "#f5f5f5" },
    { id: "slate", label: "Gris ardoise", group: "Sombres monochromes", accent: "#d6dde8" },
    { id: "forest", label: "Vert nuit", group: "Sombres monochromes", accent: "#cfe8d6" },
    { id: "hacker", label: "Hacker fluo", group: "Sombres monochromes", accent: "#00ff66" },
    { id: "cyberpunk", label: "Cyberpunk", group: "Sombres monochromes", accent: "#ff2e97" },
    { id: "amber", label: "Ambre terminal", group: "Sombres monochromes", accent: "#ffb000" },
    { id: "blood", label: "Rouge sang", group: "Sombres monochromes", accent: "#f87171" },
    { id: "nord", label: "Nord", group: "Sombres monochromes", accent: "#88c0d0" },
    
    // ---- VIFS (neutre + accent qui claque) ----
    { id: "lime", label: "Vert lime", group: "Vifs", accent: "#a3e635" },
    { id: "orange", label: "Orange vif", group: "Vifs", accent: "#ff7a18" },
    { id: "pink", label: "Rose vif", group: "Vifs", accent: "#ff4d8d" },
    { id: "cyan", label: "Cyan électrique", group: "Vifs", accent: "#22d3ee" },
    { id: "grape", label: "Violet vif", group: "Vifs", accent: "#a855f7" },
    { id: "sun", label: "Jaune soleil", group: "Vifs", accent: "#fbbf24" },
    { id: "coral", label: "Rouge corail", group: "Vifs", accent: "#f43f5e" },
    
    // ---- SOMBRES MULTICOULEURS ----
    { id: "sunset", label: "Sunset", group: "Sombres multicolores", accent: "#ff8fab" },
    { id: "ocean", label: "Ocean", group: "Sombres multicolores", accent: "#38bdf8" },
    { id: "forestmulti", label: "Forest", group: "Sombres multicolores", accent: "#4ade80" },
    { id: "candy", label: "Candy", group: "Sombres multicolores", accent: "#f472b6" },
    { id: "autumn", label: "Autumn", group: "Sombres multicolores", accent: "#fb923c" },
    { id: "neon", label: "Neon", group: "Sombres multicolores", accent: "#ff2e97" },

    // ---- CLAIRS MONOCHROMES ----
    { id: "paper", label: "Papier", group: "Clairs monochromes", accent: "#7c5cff" },
    { id: "solarized", label: "Solarized", group: "Clairs monochromes", accent: "#268bd2" },
    { id: "sepia", label: "Sépia vintage", group: "Clairs monochromes", accent: "#9c6644" },

    // ---- CLAIRS MULTICOULEURS ----
    { id: "paperbright", label: "Papier vif", group: "Clairs multicolores", accent: "#e0567b" },
    { id: "coffee", label: "Café", group: "Clairs multicolores", accent: "#b5532e" },
    { id: "mintpastel", label: "Menthe pastel", group: "Clairs multicolores", accent: "#0e9488" },
    { id: "lavenderpastel", label: "Lavande pastel", group: "Clairs multicolores", accent: "#8b5cf6" },
    { id: "sorbet", label: "Sorbet", group: "Clairs multicolores", accent: "#f0617e" },


    // ---- ★ SPÉCIAUX ----
    { id: "poulpie", label: "Poulpie", group: "Spéciaux", accent: "#b794f6" },
    { id: "epitech", label: "W@C", group: "Spéciaux", accent: "#3362aa" },
];

const STORAGE_KEY = "trackit-theme";
const DEFAULT_THEME = "poulpie";

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    });

    useEffect(() => {
        document.documentElement.className = `theme-${theme}`;
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    return { theme, setTheme, themes: THEMES };
}