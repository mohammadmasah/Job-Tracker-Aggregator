import DeleteButton from "../common/DeleteButton";
import { IoLocationOutline, IoGlobeOutline, IoWalletOutline, IoBriefcaseOutline, IoArrowForwardOutline, IoStar, IoStarOutline } from "react-icons/io5";
import { STATUS_META, needsRelance } from "../../constants/status";

const TYPE_LABELS = { alternance: "Alternance", stage: "Stage", cdi: "CDI", cdd: "CDD" };

export default function ApplicationCard({ application, onDelete, onSelect, favorite, onToggleFavorite }) {
    const status = STATUS_META[application.status] || { label: application.status, color: "var(--accent)" };
    const company = application.company || "Entreprise non renseignée";
    const date = application.applied_at ? new Date(application.applied_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Date non renseignée";
    return (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-soft bg-panel shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-3 border-b border-border-soft bg-card px-5 py-3">
                <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-text">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />{status.label}
                </span>
                <button type="button" onClick={() => onToggleFavorite?.(application.id)} aria-pressed={!!favorite}
                    aria-label={favorite ? `Retirer ${company} des favoris` : `Ajouter ${company} aux favoris`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-2 hover:bg-bg hover:text-accent">
                    {favorite ? <IoStar className="text-lg text-accent" /> : <IoStarOutline className="text-lg" />}
                </button>
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="mb-4 flex items-center gap-3">
                    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">{company.slice(0, 2).toUpperCase()}</span>
                    <h3 className="line-clamp-2 min-w-0 text-base font-bold leading-snug text-text" title={company}>{company}</h3>
                </div>
                <button type="button" onClick={onSelect} className="text-left text-text hover:text-accent" aria-label={`Ouvrir la candidature chez ${company}`}>
                    <span className="line-clamp-2 min-h-12 text-base font-semibold leading-6" title={application.position}>{application.position || "Poste non renseigné"}</span>
                </button>
                <div className="mt-4 space-y-2.5">
                    <InfoLine icon={IoLocationOutline}>{application.location || "Lieu non renseigné"}</InfoLine>
                    <InfoLine icon={IoBriefcaseOutline}>{TYPE_LABELS[application.type] || application.type || "Contrat non renseigné"}</InfoLine>
                    <InfoLine icon={IoWalletOutline}>{application.salary || "Salaire non renseigné"}</InfoLine>
                </div>
                <div className="mt-4 flex min-h-7 flex-wrap gap-2">
                    {needsRelance(application) && <span className="rounded-md border border-border-soft bg-card px-2 py-1 text-xs font-semibold text-text">À relancer</span>}
                    {application.remote && <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs text-accent"><IoGlobeOutline />Télétravail</span>}
                </div>
            </div>
            <footer className="flex items-center justify-between gap-2 border-t border-border-soft px-5 py-3">
                <span className="text-xs text-text-2">{date}</span>
                <div className="flex items-center gap-2">
                    <DeleteButton compact label={`la candidature « ${application.position} — ${company} » et ses documents`} onDelete={() => onDelete(application.id)} />
                <button type="button" onClick={onSelect} className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20">Voir la fiche<IoArrowForwardOutline /></button>
                </div>
            </footer>
        </article>
    );
}

function InfoLine({ icon: Icon, children }) {
    return <div className="flex min-w-0 items-center gap-2 text-sm text-text-2"><Icon className="shrink-0 text-base" /><span className="truncate" title={children}>{children}</span></div>;
}
