import {
    IoBusinessOutline,
    IoLocationOutline,
    IoWalletOutline,
    IoCalendarOutline,
    IoRocketOutline,
    IoCodeSlashOutline,
} from "react-icons/io5";

// Formate une date ISO en "12 juil. 2026"
function formatDate(iso) {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
}

// Formate le salaire à partir des trois champs
function formatSalary(min, max, currency) {
    if (!min && !max) return null;
    const c = currency || "€";
    if (min && max) return `${min} - ${max} ${c}`;
    return `${min || max} ${c}`;
}

export default function OfferCard({ offer }) {
    const salary = formatSalary(offer.salary_min, offer.salary_max, offer.salary_currency);
    const date = formatDate(offer.createdAt);
    const skills = (offer.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

    return (
        <div
            className="group flex flex-col bg-panel border border-border-soft rounded-[8px] overflow-hidden transition-all hover:border-border hover:shadow-lg hover:-translate-y-0.5 font-mono"
            style={{ borderLeft: "4px solid var(--accent)" }}
        >
            <div className="flex flex-col gap-3 p-5">
                {/* En-tête : titre + entreprise */}
                <div>
                    <h2 className="text-[15px] font-bold text-text leading-snug line-clamp-2">
                        {offer.title || "Offre sans titre"}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1 text-text-2 text-[12px]">
                        <IoBusinessOutline className="text-text-3 shrink-0" />
                        <span className="truncate">{offer.company || "—"}</span>
                    </div>
                </div>

                {/* Aperçu de description */}
                {offer.descriptionPreview && (
                    <p className="text-[12px] text-text-3 leading-relaxed line-clamp-3">
                        {offer.descriptionPreview}
                    </p>
                )}

                {/* Infos clés avec icônes colorées */}
                <div className="flex flex-col gap-1.5 mt-1">
                    {offer.localisation && (
                        <InfoLine icon={IoLocationOutline} color="var(--c1)">{offer.localisation}</InfoLine>
                    )}
                    {salary && (
                        <InfoLine icon={IoWalletOutline} color="#4ade80">{salary}</InfoLine>
                    )}
                    {offer.start && (
                        <InfoLine icon={IoRocketOutline} color="var(--c3)">Début : {offer.start}</InfoLine>
                    )}
                    {date && (
                        <InfoLine icon={IoCalendarOutline} color="var(--text-3)">Publiée le {date}</InfoLine>
                    )}
                </div>

                {/* Compétences en pastilles */}
                {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {skills.slice(0, 6).map((skill) => (
                            <span
                                key={skill}
                                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-[4px]"
                                style={{ backgroundColor: "var(--card)", color: "var(--text-2)", border: "1px solid var(--border-soft)" }}
                            >
                                <IoCodeSlashOutline className="text-[11px] text-accent" />
                                {skill}
                            </span>
                        ))}
                        {skills.length > 6 && (
                            <span className="text-[10px] text-text-3 self-center">+{skills.length - 6}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function InfoLine({ icon: Icon, color, children }) {
    return (
        <div className="flex items-center gap-2 text-[12px] text-text-2 min-w-0">
            <Icon className="shrink-0 text-[14px]" style={{ color }} />
            <span className="truncate">{children}</span>
        </div>
    );
}