import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoArrowForwardOutline, IoSearchOutline, IoChatbubblesOutline } from 'react-icons/io5';
import PageHeader from '../../components/layout/PageHeader';
import DeleteButton from '../../components/common/DeleteButton';
import { createInterview, deleteInterview, interviewError, listInterviews, searchInterviewSources } from '../../api/interviews';
import { dateLabel, secondary, statusLabel } from '../../components/interviews/interviewUi';

export default function Interviews() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState('all');
    const [offset, setOffset] = useState(0);
    const [result, setResult] = useState({ items: [], total: 0 });
    const [sessions, setSessions] = useState([]);
    const [historyOffset, setHistoryOffset] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyMore, setHistoryMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [retry, setRetry] = useState(0);
    const [creating, setCreating] = useState('');
    const pending = useRef(false);
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            searchInterviewSources({ q: query, kind, offset }, controller.signal).then(({ data }) => { setResult(data); setError(''); })
                .catch(err => { if (!controller.signal.aborted) setError(interviewError(err)); })
                .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 200);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, kind, offset, retry]);
    useEffect(() => {
        let active = true;
        listInterviews(historyOffset).then(({ data }) => {
            if (active) { setSessions(data); setHistoryMore(data.length === 30); setHistoryError(''); }
        }).catch(() => { if (active) setHistoryError('Impossible de charger tes séances.'); })
            .finally(() => { if (active) setHistoryLoading(false); });
        return () => { active = false; };
    }, [retry, historyOffset]);
    const choose = async source => {
        if (pending.current) return;
        pending.current = true; setCreating(`${source.kind}-${source.id}`); setError('');
        try { const { data } = await createInterview({ source_kind: source.kind, source_id: source.id }); navigate(`/interviews/${data.id}`); }
        catch (err) { setError(interviewError(err)); }
        finally { pending.current = false; setCreating(''); }
    };
    return <div className="min-h-full bg-bg text-text">
        <PageHeader eyebrow="Ton prochain entretien" title="Préparer mon entretien" description="Un poste précis. Des questions adaptées. Un entraînement à ton rythme." />
        <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
            <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-accent/5 p-6 sm:p-8">
                <div className="max-w-2xl"><span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent"><IoChatbubblesOutline className="text-lg" />Ton espace avec Poulpie</span>
                    <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Arrive avec des idées claires,<br className="hidden sm:block" /> pas des réponses récitées.</h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-2">Choisis une candidature ou une offre. Le coach utilise ses informations pour te faire pratiquer, t’aider à préciser tes réponses et te remettre un bilan personnel.</p>
                </div>
                <ol className="mt-6 grid gap-3 text-xs sm:grid-cols-3">{['Choisis ton poste', 'Entraîne-toi, une question à la fois', 'Garde ton bilan et ton PDF'].map((text, index) => <li key={text} className="flex items-center gap-3 rounded-xl bg-panel/70 p-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">{index + 1}</span>{text}</li>)}</ol>
            </div>
            <section aria-labelledby="job-search-title">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="job-search-title" className="text-lg font-bold">Pour quel poste veux-tu t’entraîner ?</h2><Link to="/job-offers" className="text-xs text-accent underline">Explorer les offres enregistrées</Link></div>
                <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Rechercher une entreprise ou un poste</span><IoSearchOutline className="pointer-events-none absolute left-4 top-4 text-text-3" /><input type="search" value={query} onChange={event => { setLoading(true); setOffset(0); setQuery(event.target.value); }} placeholder="Rechercher une entreprise ou un poste…" className="w-full rounded-xl border border-border-soft bg-panel py-3 pl-11 pr-4 text-sm" /></label>
                    <select aria-label="Source des postes" value={kind} onChange={event => { setLoading(true); setOffset(0); setKind(event.target.value); }} className="rounded-xl border border-border-soft bg-panel p-3 text-sm"><option value="all">Candidatures et offres</option><option value="application">Mes candidatures</option><option value="offer">Offres enregistrées</option></select>
                </div>
                {error && <div role="alert" className="mt-3 text-sm text-red-500">{error} <button className="underline" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Réessayer</button></div>}
                {loading ? <p role="status" className="py-10 text-sm text-text-3">Recherche des postes…</p> : !result.items.length ? <div className="my-4 rounded-2xl border border-dashed border-border-soft p-8 text-center"><p className="text-sm text-text-2">{query ? 'Aucun poste ne correspond à cette recherche.' : 'Ajoute une candidature pour commencer ton premier entraînement.'}</p><Link className="mt-3 inline-block text-sm text-accent underline" to="/applications">Mes candidatures</Link></div> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {result.items.map(source => <button key={`${source.kind}-${source.id}`} onClick={() => choose(source)} disabled={!!creating} className="group flex flex-col rounded-2xl border border-border-soft bg-panel p-5 text-left transition hover:border-accent hover:shadow-sm disabled:opacity-50">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-3">{source.kind === 'application' ? 'Candidature' : 'Offre enregistrée'}</span><span className="mt-3 text-base font-bold break-words">{source.company}</span><span className="mt-1 text-sm text-text-2 break-words">{source.position}</span><span className="mt-2 text-xs text-text-3">{source.location}</span>
                        <span className="mt-auto flex items-center justify-between gap-2 pt-5 text-xs text-accent">{creating === `${source.kind}-${source.id}` ? 'Préparation…' : 'Préparer cette rencontre'}<IoArrowForwardOutline className="shrink-0 transition group-hover:translate-x-1" /></span>
                    </button>)}
                </div>}
                {(offset > 0 || offset + 30 < result.total) && <div className="mt-4 flex items-center justify-between"><button className={secondary} disabled={!offset || loading} onClick={() => { setLoading(true); setOffset(value => value - 30); }}>Précédent</button><span className="text-xs text-text-3">{offset + 1}–{Math.min(offset + 30, result.total)} / {result.total}</span><button className={secondary} disabled={offset + 30 >= result.total || loading} onClick={() => { setLoading(true); setOffset(value => value + 30); }}>Suivant</button></div>}
            </section>
            <section className="border-t border-border-soft pt-6" aria-labelledby="history-title"><h2 id="history-title" className="text-lg font-bold">Mes entraînements</h2><p className="mt-1 text-xs text-text-3">Reprends une séance ou retrouve un bilan. Tes échanges restent séparés du chatbot quotidien.</p>
                {historyError && <p role="alert" className="mt-3 text-sm text-red-500">{historyError} <button onClick={() => setRetry(value => value + 1)} className="underline">Réessayer</button></p>}
                {historyLoading ? <p className="mt-4 text-sm text-text-3">Chargement…</p> : !sessions.length ? <p className="py-6 text-sm text-text-3">Tes séances apparaîtront ici.</p> : <ul className="mt-4 divide-y divide-border-soft rounded-2xl border border-border-soft bg-panel">{sessions.map(item => <li key={item.id} className="flex items-center gap-3 px-4 py-4 sm:px-5"><Link to={`/interviews/${item.id}`} className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{item.company} <span className="font-normal text-text-3">· {item.position}</span></p><p className="mt-1 text-xs text-text-3">{dateLabel(item.updated_at)} · {item.answered}/{item.question_count} réponses · {item.language.toUpperCase()}</p></Link><Link to={`/interviews/${item.id}`} className="rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent">{statusLabel(item.status)}</Link><DeleteButton compact label={`la séance chez ${item.company}`} onDelete={async () => { await deleteInterview(item.id); setSessions(previous => previous.filter(row => row.id !== item.id)); }} /></li>)}</ul>}
                <div className="mt-3 flex gap-2">{historyOffset > 0 && <button className={secondary} onClick={() => { setHistoryLoading(true); setHistoryOffset(value => value - 30); }}>Séances précédentes</button>}{historyMore && <button className={secondary} onClick={() => { setHistoryLoading(true); setHistoryOffset(value => value + 30); }}>Séances suivantes</button>}</div>
            </section>
        </div>
    </div>;
}
