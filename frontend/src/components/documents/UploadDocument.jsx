import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { IoCloseOutline, IoDocumentAttachOutline } from 'react-icons/io5';
import { getApplications } from '../../api/application';
import { uploadDocument } from '../../api/document';

import { TYPES } from "./documentTypes";

export default function UploadDocument({ application, onClose, onUploaded }) {
    const dialog = useRef(null);
    const pending = useRef(false);
    const titleId = useId();
    const [applications, setApplications] = useState(application ? [application] : []);
    const [selected, setSelected] = useState(application?.id ? String(application.id) : '');
    const [search, setSearch] = useState('');
    const [file, setFile] = useState(null);
    const [type, setType] = useState('other');
    const [loading, setLoading] = useState(!application);
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);
    useEffect(() => {
        if (application) return;
        let active = true;
        getApplications().then(({ data }) => { if (active) setApplications(data); })
            .catch(() => { if (active) setLoadError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [application, attempt]);
    const upload = async (event) => {
        event.preventDefault();
        if (pending.current || !file || !selected) return;
        if (!file.size || file.size > 20 * 1024 * 1024) { setError('Choisis un fichier non vide de 20 Mo maximum.'); return; }
        pending.current = true; setBusy(true); setError('');
        try {
            const { data } = await uploadDocument(selected, file, type);
            setDone(data);
            window.dispatchEvent(new CustomEvent('trackit-documents-changed', { detail: { applicationId: Number(selected) } }));
            onUploaded?.(data);
        } catch (err) {
            setError(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Envoi impossible. Vérifie ta connexion puis réessaie.');
        } finally { pending.current = false; setBusy(false); }
    };
    const chosen = applications.find(item => String(item.id) === selected);
    const filtered = applications.filter(item => `${item.company} ${item.position}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')) || String(item.id) === selected);
    const input = 'mt-2 w-full rounded-lg border border-border-soft bg-bg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent';
    return createPortal(<dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!pending.current) onClose(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-soft bg-panel p-6 text-text shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4"><div><IoDocumentAttachOutline className="text-2xl text-accent mb-3" /><h2 id={titleId} className="text-lg font-bold">Ajouter un document</h2></div><button onClick={onClose} disabled={busy} aria-label="Fermer" className="rounded-md p-2 hover:bg-card disabled:opacity-40"><IoCloseOutline /></button></div>
        {done ? <div className="mt-5 space-y-4">
            <p role="status" className="text-sm leading-relaxed break-words"><strong>{done.filename}</strong> a été ajouté à la candidature <strong>{chosen?.company}</strong> — {chosen?.position}.</p>
            <Link onClick={onClose} to={`/applications?open=${done.application_id}`} className="inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white">Voir les documents de cette candidature</Link>
            <button onClick={onClose} className="block text-xs text-text-3 underline">Fermer</button>
        </div> : <form onSubmit={upload} className="mt-4 space-y-4">
            <p className="text-xs text-text-3 leading-relaxed">Garde le CV, la lettre ou les pièces envoyées à cette entreprise dans sa candidature. Ce fichier ne sera pas envoyé au chatbot.</p>
            {loading ? <p role="status" className="text-sm">Chargement des candidatures…</p> : loadError ? <div role="alert" className="text-sm text-red-500">Impossible de charger les candidatures. <button type="button" onClick={() => { setLoadError(false); setLoading(true); setAttempt(value => value + 1); }} className="underline">Réessayer</button></div> : !applications.length ? <p className="text-sm">Ajoute d’abord une candidature. <Link to="/applications" onClick={onClose} className="text-accent underline">Aller aux candidatures</Link></p> : <>
                {application ? <div className="rounded-lg border border-border-soft bg-card p-3 text-sm break-words"><strong>{application.company}</strong><p className="mt-1 text-xs text-text-3">{application.position}</p></div> : <div>
                    <label className="block text-xs text-text-2">Rechercher une entreprise ou un poste<input value={search} onChange={e => setSearch(e.target.value)} disabled={busy} placeholder="Ex. Havas…" className={input} /></label>
                    <label className="mt-3 block text-xs text-text-2">Candidature concernée<select required value={selected} onChange={e => setSelected(e.target.value)} disabled={busy} className={input}><option value="">Choisir une candidature…</option>{filtered.map(item => <option key={item.id} value={item.id}>{item.company} — {item.position}</option>)}</select></label>
                </div>}
                <label className="block text-xs text-text-2">Type de document<select value={type} onChange={e => setType(e.target.value)} disabled={busy} className={input}>{TYPES.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
                <label className="block rounded-xl border border-dashed border-border p-4 text-xs text-text-2">Fichier · 20 Mo maximum<input type="file" required disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }} className="mt-3 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:p-2 file:text-accent" /></label>
                {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} disabled={busy} className="px-3 text-xs text-text-3">Annuler</button><button type="submit" disabled={busy || !file || !selected} className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Envoi en cours…' : 'Enregistrer le document'}</button></div>
            </>}
        </form>}
    </dialog>, document.body);
}
