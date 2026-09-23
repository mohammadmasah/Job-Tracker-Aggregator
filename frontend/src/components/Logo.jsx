export default function Logo({ size = 1 }) {
    const fontSize = 10 * size;

    return (
        <div
            className="flex items-baseline gap-2 font-mono font-bold select-none tracking-tight"
            style={{ fontSize: `${fontSize}px` }}
        >
            <span>
                <span className="text-text">Job Tracker</span>
                <span className="text-accent"> &amp; Aggregator</span>
                <span className="ml-1 text-xs text-text-3">
                    © {new Date().getFullYear()} MD
                </span>
            </span>
        </div>
    );
}