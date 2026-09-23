import { IoAddOutline, IoCalendarOutline } from "react-icons/io5";

export default function DashboardHeader({ onAddApplication }) {
    const today = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());

    return (
        <header className="border-b border-border-soft bg-panel/70 px-5 py-5 sm:px-8">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3">
                        <IoCalendarOutline className="text-[13px] text-accent" />
                        <span className="capitalize">{today}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-wide text-text sm:text-[28px]">Tableau de bord</h1>
                    <p className="mt-1 text-xs text-text-2">Suivez vos candidatures et gardez les prochaines actions en vue.</p>
                </div>

                <button
                    type="button"
                    onClick={onAddApplication}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-accent px-4 text-[11px] font-bold uppercase tracking-wider text-bg transition-colors hover:bg-accent-2"
                >
                    <IoAddOutline className="text-[16px]" />
                    Nouvelle candidature
                </button>
            </div>
        </header>
    );
}