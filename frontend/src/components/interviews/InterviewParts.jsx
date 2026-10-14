import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoSparklesOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';

export function BusyCoach({ finishing }) {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => { const timer = setInterval(() => setSeconds(value => value + 1), 1000); return () => clearInterval(timer); }, []);
    return <div role="status" className="flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-5">
        <IoSparklesOutline className="shrink-0 animate-pulse text-2xl text-accent" />
        <div><p className="text-sm font-semibold">{finishing ? 'Poulpie prépare ton bilan…' : 'Poulpie prépare la suite…'}</p><p className="mt-1 text-xs text-text-3">{seconds < 25 ? 'Le coach analyse le poste et tes réponses.' : 'Un modèle local peut prendre plus de temps. Tu peux patienter ici.'} · {seconds} s</p></div>
    </div>;
}

export function AssistantBadge({ settings }) {
    const provider = { local: 'Ollama · local', openai: 'OpenAI', gemini: 'Gemini', claude: 'Claude' }[settings?.provider];
    return <Link to="/settings/assistant" className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-panel px-3 py-1.5 text-xs text-text-2" title="Configurer l’assistant"><span className="size-2 rounded-full bg-accent" />{provider || 'Configurer mon assistant'}{settings?.model && <span className="hidden max-w-40 truncate text-text-3 xl:inline">· {settings.model}</span>}</Link>;
}

export function CoachingList({ title, items = [], positive = false }) {
    return <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-3">{title}</h3><ul className="space-y-2">{items.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-relaxed"><IoCheckmarkCircleOutline className={`mt-1 shrink-0 ${positive ? 'text-accent' : 'text-text-3'}`} /><span className="min-w-0 break-words">{item}</span></li>)}</ul></div>;
}

export function JobContext({ record }) {
    const context = record.context;
    const plain = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    const description = plain(context.description || context.notes || context.descriptionPreview);
    const url = /^https?:\/\//i.test(context.url || '') ? context.url : null;
    return <details className="rounded-2xl border border-border-soft bg-panel p-4">
        <summary className="cursor-pointer text-sm font-semibold">Le poste utilisé par le coach</summary>
        <p className="mt-3 text-xs text-text-3">Une copie des informations de cette candidature est conservée avec la séance.</p>
        <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-text-3">Entreprise</dt><dd>{record.company}</dd></div><div><dt className="text-text-3">Poste</dt><dd>{record.position}</dd></div>
            {(context.location || context.localisation?.length > 0) && <div><dt className="text-text-3">Lieu</dt><dd>{context.location || context.localisation.join(', ')}</dd></div>}
        </dl>
        <p className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-text-2">{description || 'Aucune description enregistrée. Le coach se basera sur le titre du poste et ton parcours, sans inventer les attentes de l’entreprise.'}</p>
        {url && <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-accent underline">Ouvrir l’annonce ↗</a>}
    </details>;
}
