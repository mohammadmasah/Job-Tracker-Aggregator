import { useRef, useState } from 'react';
import { IoArrowForwardOutline, IoDocumentAttachOutline } from 'react-icons/io5';
import { extractInterviewCV, interviewError } from '../../api/interviews';
import { field, primary } from './interviewUi';

export default function InterviewSetup({ record, settings, busy, onStart }) {
    const [profile, setProfile] = useState(record.profile);
    const [language, setLanguage] = useState(record.language);
    const [focus, setFocus] = useState(record.focus);
    const [questionCount, setQuestionCount] = useState(record.question_count);
    const [extracting, setExtracting] = useState(false);
    const [fileError, setFileError] = useState('');
    const [filename, setFilename] = useState('');
    const fileInput = useRef(null);
    const importCV = async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setFileError('Choisis un PDF de 5 Mo maximum.'); return; }
        setExtracting(true); setFileError('');
        try { const { data } = await extractInterviewCV(file); setProfile(data.text); setFilename(file.name); }
        catch (error) { setFileError(interviewError(error)); }
        finally { setExtracting(false); }
    };
    return <form onSubmit={event => { event.preventDefault(); onStart({ profile, language, focus, question_count: Number(questionCount), revision: record.revision }); }} className="space-y-6 rounded-3xl border border-border-soft bg-panel p-5 sm:p-8">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-accent">Avant de commencer</p><h2 className="mt-2 text-xl font-bold">Un entraînement qui te ressemble.</h2><p className="mt-2 text-sm leading-relaxed text-text-2">Le poste est déjà ajouté au contexte. Complète ton parcours si tu veux des questions plus précises.</p></div>
        <fieldset disabled={busy || extracting} className="space-y-5 disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold text-text-2">Langue de l’entretien<select value={language} onChange={e => setLanguage(e.target.value)} className={field}><option value="fr">Français</option><option value="en">English</option></select></label>
                <label className="text-xs font-semibold text-text-2">Type d’entretien<select value={focus} onChange={e => setFocus(e.target.value)} className={field}><option value="mixed">Complet</option><option value="hr">Parcours et motivation</option><option value="technical">Compétences métier</option></select></label>
                <label className="text-xs font-semibold text-text-2">Durée du parcours<select value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className={field}><option value={5}>5 questions</option><option value={8}>8 questions</option></select></label></div>
            <div><div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor="interview-profile" className="text-sm font-semibold">Ton parcours <span className="font-normal text-text-3">· facultatif</span></label><button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-2 text-xs text-accent underline"><IoDocumentAttachOutline />{extracting ? 'Lecture du PDF…' : 'Importer le texte de mon CV'}</button><input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={importCV} className="hidden" aria-label="Importer un CV PDF" /></div>
                <textarea id="interview-profile" maxLength={8000} rows={7} value={profile} onChange={e => setProfile(e.target.value)} placeholder="Tes expériences, tes projets, les compétences que tu veux mettre en avant…" className={`${field} resize-y leading-relaxed`} />
                <div className="mt-2 flex justify-between gap-3 text-xs text-text-3"><span>{filename ? `Texte extrait de ${filename}. Tu peux le modifier.` : 'PDF texte · 5 Mo, 10 pages maximum. L’import remplace le texte de ce champ.'}</span><span className="shrink-0">{profile.length}/8 000</span></div>
                {fileError && <p role="alert" className="mt-2 text-sm text-red-500">{fileError}</p>}
            </div>
        </fieldset>
        <div className="rounded-xl bg-bg p-4 text-xs leading-relaxed text-text-2">{settings?.provider === 'local' ? 'Avec Ollama, la préparation et tes réponses sont traitées sur ton ordinateur.' : 'Avec une API distante, le poste, ton parcours et tes réponses sont transmis au fournisseur choisi dans Assistant IA. Son utilisation peut consommer du crédit API.'} Les réglages et le texte sont enregistrés au démarrage. Le fichier PDF original n’est pas conservé ici.</div>
        <button type="submit" disabled={busy || extracting || !settings} className={`${primary} w-full sm:w-auto`}>{busy ? 'Préparation en cours…' : 'Commencer mon entraînement'}<IoArrowForwardOutline /></button>
    </form>;
}
