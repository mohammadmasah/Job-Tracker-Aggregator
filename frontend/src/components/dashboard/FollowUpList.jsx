import { Link } from "react-router-dom";
import { IoArrowForwardOutline, IoNotificationsOutline } from "react-icons/io5";
import { daysSince, needsRelance } from "../../constants/status";

export default function FollowUpList({ applications = [] }) {
    const followUps = applications
        .filter(needsRelance)
        .sort((first, second) => daysSince(second.applied_at) - daysSince(first.applied_at))
        .slice(0, 4);

    return (
        <section className="border border-border-soft bg-panel">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center border border-border-soft bg-card text-c4">
                        <IoNotificationsOutline className="text-[16px]" />
                    </span>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-3">À relancer</p>
                        <h2 className="mt-0.5 text-sm font-bold text-text">Actions prioritaires</h2>
                    </div>
                </div>
                <span className="text-xl font-bold tabular-nums text-c4">{followUps.length}</span>
            </div>

            {followUps.length ? (
                <div className="divide-y divide-border-soft">
                    {followUps.map((application) => (
                        <Link
                            key={application.id}
                            to="/applications"
                            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-card"
                        >
                            <span className="size-2 shrink-0 rounded-full bg-c4" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-text">{application.company || "Entreprise non renseignée"}</span>
                                <span className="mt-1 block truncate text-[11px] text-text-2">{application.position || "Poste non renseigné"}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold uppercase text-c4">{daysSince(application.applied_at)} j</span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="px-5 py-8 text-center text-xs text-text-3">Aucune relance à prévoir pour le moment.</div>
            )}

            <Link to="/applications" className="flex items-center justify-between border-t border-border-soft px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-2 transition-colors hover:bg-card hover:text-text">
                Gérer les candidatures
                <IoArrowForwardOutline className="text-[14px]" />
            </Link>
        </section>
    );
}