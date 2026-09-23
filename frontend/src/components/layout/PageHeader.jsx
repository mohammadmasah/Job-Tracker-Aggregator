export default function PageHeader({ eyebrow = "Espace de travail", title, description, actions }) {
    return (
        <header className="flex shrink-0 flex-col gap-4 border-b border-border-soft bg-panel px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-3">{eyebrow}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-wide text-text sm:text-[28px]">{title}</h1>
                {description && <p className="mt-1 text-xs text-text-2">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    );
}