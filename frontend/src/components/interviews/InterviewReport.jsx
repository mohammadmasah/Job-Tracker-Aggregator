import { CoachingList } from './InterviewParts';

export default function InterviewReport({ record, actions }) {
    const report = record.report;
    return <section className="space-y-6 rounded-3xl border border-accent/25 bg-panel p-5 sm:p-8" aria-labelledby="report-title">
        <header><p className="text-xs font-semibold uppercase tracking-widest text-accent">Ton bilan personnel</p><h2 id="report-title" className="mt-2 text-2xl font-bold">Une base concrète pour progresser.</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-2">{report.summary}</p><p className="mt-3 text-xs text-text-3">Bilan fondé sur {record.answered} réponse{record.answered > 1 ? 's' : ''}. Ce sont des conseils d’entraînement, pas une évaluation de l’employeur.</p></header>
        <div className="grid gap-5 lg:grid-cols-2">{[['strengths', 'Tes points forts', 'border-accent/20 bg-accent/5'], ['improvements', 'À travailler', 'border-amber-500/20 bg-amber-500/5']].map(([key, title, color]) => <div key={key} className={`rounded-2xl border p-5 ${color}`}><h3 className="font-bold">{title}</h3><ul className="mt-4 space-y-4">{report[key]?.map((item, index) => <li key={index}><p className="text-sm font-semibold leading-relaxed">{item.point}</p><p className="mt-1 text-xs leading-relaxed text-text-2">{item.evidence}</p><a href={`#question-${item.question}`} className="mt-1 inline-block text-xs text-accent underline">Revoir la réponse {item.question}</a></li>)}</ul>{!report[key]?.length && <p className="mt-3 text-sm text-text-2">Pas assez d’éléments dans cette séance pour dégager un point fort précis.</p>}</div>)}</div>
        <div className="grid gap-6 lg:grid-cols-2"><CoachingList title="Ton plan pour la prochaine fois" items={report.next_steps} positive /><CoachingList title="Questions à poser à l’entreprise" items={report.employer_questions} /></div>
        {actions && <div className="flex flex-wrap gap-3 border-t border-border-soft pt-5">{actions}</div>}
    </section>;
}
