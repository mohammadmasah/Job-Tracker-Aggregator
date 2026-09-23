import { Link } from "react-router-dom";
import { IoArrowForwardOutline, IoGlobeOutline } from "react-icons/io5";
import { STATUS_META } from "../../constants/status";

function applicationDate(application) {
    const date = application.applied_at || application.created_at;
    if (!date) return "Date inconnue";
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date));
}

export default function RecentApplications({ applications = [] }) {
    const recentApplications = [...applications]
        .sort((first, second) => new Date(second.created_at || second.applied_at || 0) - new Date(first.created_at || first.applied_at || 0))
        .slice(0, 5);

    return (
        <section className="border border-border-soft bg-panel">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-3">Activité récente</p>
                    <h2 className="mt-0.5 text-sm font-bold text-text">Dernières candidatures</h2>
                </div>
                <Link to="/applications" className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-2 transition-colors hover:text-text">
                    Tout voir <IoArrowForwardOutline className="text-[13px]" />
                </Link>
            </div>

            {recentApplications.length ? (
                <div className="divide-y divide-border-soft">
                    {recentApplications.map((application) => {
                        const status = STATUS_META[application.status] || { label: application.status || "À définir", color: "var(--text-3)" };
                        return (
                            <Link key={application.id} to="/applications" className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-card">
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                <span className="min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className="truncate text-xs font-bold text-text">{application.company || "Entreprise non renseignée"}</span>
                                        {application.remote && <IoGlobeOutline className="shrink-0 text-[12px] text-text-3" title="Télétravail" />}
                                    </span>
                                    <span className="mt-1 block truncate text-[11px] text-text-2">{application.position || "Poste non renseigné"}</span>
                                </span>
                                <span className="text-right">
                                    <span className="block text-[10px] font-semibold uppercase" style={{ color: status.color }}>{status.label}</span>
                                    <span className="mt-1 block text-[10px] text-text-3">{applicationDate(application)}</span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="px-5 py-10 text-center text-xs text-text-3">Vos nouvelles candidatures apparaîtront ici.</div>
            )}
        </section>
    );
}