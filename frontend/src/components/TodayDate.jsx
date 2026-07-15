import { useState, useEffect } from "react";
import { useClockSettings } from "../hooks/useClockSettings";

export default function TodayDate() {
    const { settings } = useClockSettings();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // --- Date ---
    const formattedDate =
        settings.dateStyle === "short"
            ? now.toLocaleDateString("fr-FR")
            : now.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
            });
    const finalDateStr = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // --- Heure ---
    let hours = now.getHours();
    let suffix = "";
    if (!settings.format24h) {
        suffix = hours >= 12 ? " PM" : " AM";
        hours = hours % 12 || 12;
    }
    const hh = hours.toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const ss = now.getSeconds().toString().padStart(2, "0");

    return (
        <div className="m-auto text-center">
            <div className={`flex items-baseline justify-center gap-1 tabular-nums clock-font-${settings.font}`}>
                <span className="text-[28px] text-accent font-bold tracking-tight tabular-nums leading-none">
                    {hh}:{mm}
                </span>
                {settings.showSeconds && (
                    <span className="text-[14px] text-accent-2 leading-none">{ss}</span>
                )}
                {suffix && (
                    <span className="text-[12px] text-text-2 leading-none">{suffix}</span>
                )}
            </div>
            {settings.showDate && (
                <p className="text-[11px] text-text-2 mt-1.5">{finalDateStr}</p>
            )}
        </div>
    );
}