import { field, primary, secondary } from '../../components/interviews/interviewUi';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { IoArrowBackOutline, IoArrowUpOutline, IoRefreshOutline, IoSparklesOutline, IoDownloadOutline } from 'react-icons/io5';
import { configureInterview, downloadInterviewReport, getInterview, interviewError, practiceInterview } from '../../api/interviews';
import { AssistantBadge, BusyCoach, CoachingList, JobContext } from '../../components/interviews/InterviewParts';
import InterviewSetup from '../../components/interviews/InterviewSetup';
import InterviewReport from '../../components/interviews/InterviewReport';

export default function InterviewRoom() {
    const { id } = useParams();
    return <Room key={id} id={id} />;
}

function Room({ id }) {
    const [record, setRecord] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [answer, setAnswer] = useState('');
    const [retry, setRetry] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const pending = useRef(false);
    const bottom = useRef(null);
    const feedbackTop = useRef(null);
    const answerInput = useRef(null);
    useEffect(() => {
        let active = true;
        Promise.all([getInterview(id), axios.get('/api/ai/settings', { withCredentials: true })]).then(([session, ai]) => {
            if (active) { setRecord(session.data); setSettings(ai.data); setError(''); }
        }).catch(err => { if (active) setError(interviewError(err)); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id, retry]);
    useEffect(() => {
        if (record?.status === 'practicing') {
            bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            answerInput.current?.focus({ preventScroll: true });
        }
    }, [record?.revision, record?.status]);
    useEffect(() => {
        if (error || record?.status === 'completed') feedbackTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [error, record?.status]);
    const run = async (action, configuration) => {
        if (pending.current) return;
        pending.current = true; setBusy(action); setError('');
        let current = record;
        try {
            if (configuration) { const saved = await configureInterview(id, configuration); current = saved.data; setRecord(current); }
            const ai = await axios.get('/api/ai/settings', { withCredentials: true }); setSettings(ai.data);
            const { data } = await practiceInterview(id, { action, answer: action === 'answer' ? answer : '', revision: current.revision, request_id: crypto.randomUUID() });
            setRecord(data); if (action === 'answer') setAnswer('');
        } catch (err) {
            setError(interviewError(err));
            // A request may finish after a dropped connection: recover the stored
            // version before allowing a retry, instead of submitting a duplicate.
            try { const saved = await getInterview(id); setRecord(saved.data); if (saved.data.answered > current.answered) setAnswer(''); } catch { /* Keep the visible session and draft answer for manual retry. */ }
        } finally { pending.current = false; setBusy(''); }
    };
    const download = async () => {
        setDownloading(true); setError('');
        try { await downloadInterviewReport(id); }
        catch { setError('Le PDF n’a pas pu être téléchargé. Réessaie ; ton bilan reste enregistré.'); }
        finally { setDownloading(false); }
    };
    if (loading) return <p role="status" className="p-8 text-sm text-text-3">Ouverture de la séance…</p>;
    if (!record) return <div className="space-y-4 p-8"><p role="alert" className="text-red-500">{error || 'Séance introuvable.'}</p><button className={secondary} onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Réessayer</button><Link className="ml-4 text-accent underline" to="/interviews">Mes entraînements</Link></div>;
    const activeQuestion = record.status === 'practicing' && record.turns.at(-1)?.answer == null;
    return <div className="min-h-full bg-bg text-text">
        <header className="border-b border-border-soft bg-panel px-5 py-5 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><Link to="/interviews" className="inline-flex items-center gap-2 text-xs text-text-3 hover:text-accent"><IoArrowBackOutline />Mes entraînements</Link><AssistantBadge settings={settings} /></div><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-accent">{record.company}</p><h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{record.position}</h1></div><p className="text-xs text-text-3">{record.language.toUpperCase()} · {record.answered}/{record.question_count} réponses enregistrées</p></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-label="Réponses enregistrées" aria-valuenow={record.answered} aria-valuemin={0} aria-valuemax={record.question_count}><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${100 * record.answered / record.question_count}%` }} /></div></header>
        <div className="mx-auto grid max-w-[1500px] gap-6 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div ref={feedbackTop} className="min-w-0 space-y-5 scroll-mt-5">
                {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500"><p>{error}</p><div className="mt-2 flex flex-wrap gap-4"><button disabled={!!busy} onClick={() => setRetry(value => value + 1)} className="underline">Recharger la séance</button><Link to="/settings/assistant" className="underline">Vérifier mon assistant IA</Link></div></div>}
                {record.status === 'ready' && <InterviewSetup key={record.revision} record={record} settings={settings} busy={!!busy} onStart={configuration => run('start', configuration)} />}
                {record.status === 'completed' && <InterviewReport record={record} actions={<><button onClick={download} disabled={downloading} className={primary}><IoDownloadOutline />{downloading ? "Préparation du PDF…" : "Télécharger mon bilan PDF"}</button><Link className={secondary} to="/interviews"><IoRefreshOutline />Préparer une autre séance</Link></>} />}
                {!!record.turns.length && <section aria-label="Conversation d’entraînement" className="space-y-6">
                    {record.status === 'completed' && <h2 className="pt-3 text-lg font-bold">Revoir mes réponses</h2>}
                    {record.turns.map((turn, index) => <article id={`question-${index + 1}`} key={index} className="scroll-mt-6 space-y-4">
                        <div className="rounded-2xl border border-border-soft bg-panel p-5 sm:p-6"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-accent"><IoSparklesOutline className="text-lg" />POULPIE <span className="ml-auto font-normal text-text-3">Question {index + 1} / {record.question_count}</span></div><p className="whitespace-pre-wrap break-words text-base leading-relaxed">{turn.question}</p>{record.status === 'completed' && turn.answer == null && <p className="mt-3 text-xs text-text-3">Question non répondue, non prise en compte dans le bilan.</p>}</div>
                        {turn.answer != null && <><div className="ml-4 rounded-2xl border border-accent/15 bg-accent/5 p-5 sm:ml-10"><p className="mb-2 text-xs font-semibold text-accent">TA RÉPONSE</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{turn.answer}</p></div>
                            <div className="rounded-2xl border border-border-soft bg-panel p-5"><p className="mb-4 text-xs font-bold uppercase tracking-widest text-text-3">Le retour du coach</p><div className="grid gap-5 md:grid-cols-2"><CoachingList title="Ce qui fonctionne" items={turn.feedback?.strengths} positive /><CoachingList title="Pour aller plus loin" items={turn.feedback?.improvements} /></div><details className="mt-5 border-t border-border-soft pt-4"><summary className="cursor-pointer text-xs font-semibold text-accent">Voir une reformulation possible</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-2">{turn.feedback?.example}</p><p className="mt-2 text-xs text-text-3">Adapte cet exemple à ton expérience réelle.</p></details></div></>}
                    </article>)}
                </section>}
                {busy && <BusyCoach key={busy} finishing={busy === 'finish'} />}
                {activeQuestion && <form onSubmit={event => { event.preventDefault(); if (answer.trim()) run('answer'); }} className="rounded-2xl border border-border-soft bg-panel p-4 sm:p-5">
                    <label htmlFor="interview-answer" className="text-sm font-semibold">À toi de répondre</label><textarea id="interview-answer" ref={answerInput} value={answer} disabled={!!busy} onChange={e => setAnswer(e.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && answer.trim() && !busy) { event.preventDefault(); run('answer'); } }} maxLength={3000} rows={5} className={`${field} resize-y leading-relaxed`} placeholder={record.language === 'en' ? 'Describe a real example, your role and what you learned…' : 'Prends un exemple réel : la situation, ton rôle et ce que tu as appris…'} />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-3">{answer.length}/3 000 · Ctrl / ⌘ + Entrée pour envoyer</p><button disabled={!answer.trim() || !!busy} className={primary}>Envoyer ma réponse<IoArrowUpOutline /></button></div>
                </form>}
                {record.status === 'review' && <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6"><h2 className="text-lg font-bold">Ton entraînement est terminé.</h2><p className="mt-2 text-sm text-text-2">Le coach peut maintenant préparer ton bilan à partir de tes {record.answered} réponses.</p><button disabled={!!busy} onClick={() => run('finish')} className={`${primary} mt-4`}>Générer mon bilan</button></div>}
                {record.status === 'practicing' && record.answered > 0 && <details className="text-xs text-text-3"><summary className="cursor-pointer">Terminer la séance plus tôt</summary><p className="my-3">Le bilan portera uniquement sur les {record.answered} réponses déjà envoyées. La réponse en cours de rédaction ne sera pas incluse.</p><button disabled={!!busy} className={secondary} onClick={() => run('finish')}>Terminer et générer mon bilan</button></details>}
                <div ref={bottom} />
            </div>
            <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
                <JobContext record={record} />
                {!!record.preparation?.role_summary && <section className="space-y-5 rounded-2xl border border-border-soft bg-panel p-5"><h2 className="text-sm font-bold">Ta fiche de préparation</h2><p className="text-sm leading-relaxed text-text-2">{record.preparation.role_summary}</p><CoachingList title="Attentes à préparer" items={record.preparation.priorities} positive /><CoachingList title="Conseils de préparation" items={record.preparation.tips} /></section>}
                <div className="rounded-2xl bg-accent/5 p-5"><h2 className="text-sm font-semibold">Un exemple vaut mieux qu’une liste.</h2><p className="mt-2 text-xs leading-relaxed text-text-2">Pour une question sur ton expérience, essaie la méthode STAR : situation, tâche, actions, résultat. Si tu débutes, un projet d’études ou personnel peut servir d’exemple.</p></div>
                <p className="px-2 text-xs leading-relaxed text-text-3">Tes réponses envoyées sont enregistrées. Tu peux retrouver cette séance dans « Mes entraînements ».</p>
            </aside>
        </div>
    </div>;
}
