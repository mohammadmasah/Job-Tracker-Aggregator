import { STATUS_META } from "../../constants/status";

const STAGES = [
    "to_apply",
    "applied",
    "interview",
    "technical_test",
    "offer",
    "accepted",
    "rejected",
];

export default function ApplicationsPipeline({ applications = [] }) {
    const counts = applications.reduce((totals, application) => {
        totals[application.status] = (totals[application.status] || 0) + 1;
        return totals;
    }, {});

    const activeCount = applications.filter((application) => !["accepted", "rejected"].includes(application.status)).length;

    return (
        <section className="border border-border-soft bg-panel p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-3">Pipeline</p>
                    <h2 className="mt-1 text-base font-bold text-text">État des candidatures</h2>
                </div>
                <span className="border border-border-soft bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
                    {activeCount} active{activeCount > 1 ? "s" : ""}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden border border-border-soft bg-border-soft sm:grid-cols-4 xl:grid-cols-7">
                {STAGES.map((status) => {
                    const meta = STATUS_META[status];
                    return (
                        <div key={status} className="min-h-28 bg-card p-3">
                            <span className="mb-6 block h-1 w-7" style={{ backgroundColor: meta.color }} />
                            <span className="block text-2xl font-bold tabular-nums text-text">{counts[status] || 0}</span>
                            <span className="mt-1 block text-[10px] uppercase tracking-wide text-text-3">{meta.label}</span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}