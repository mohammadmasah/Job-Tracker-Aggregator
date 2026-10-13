import { useEffect, useState } from 'react';
import { IoDocumentTextOutline, IoDownloadOutline, IoAddOutline } from 'react-icons/io5';
import { getDocuments, deleteDocument, downloadDocument } from '../../api/document';
import DeleteButton from '../common/DeleteButton';
import UploadDocument from './UploadDocument';
import { documentTypeLabel } from './documentTypes';

export default function ApplicationDocuments({ application }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [downloading, setDownloading] = useState(null);
    useEffect(() => {
        let active = true;
        let request = 0;
        const refresh = () => {
            const current = ++request;
            getDocuments(application.id).then(({ data }) => {
                if (active && current === request) { setDocuments(data); setError(''); }
            }).catch(() => { if (active && current === request) setError('Impossible de charger les documents.'); })
                .finally(() => { if (active && current === request) setLoading(false); });
        };
        const changed = event => { if (event.detail?.applicationId === application.id) refresh(); };
        refresh();
        window.addEventListener('trackit-documents-changed', changed);
        return () => { active = false; window.removeEventListener('trackit-documents-changed', changed); };
    }, [application.id, attempt]);
    const download = async (item) => {
        setDownloading(item.id); setError('');
        try { await downloadDocument(item); }
        catch { setError('Téléchargement impossible. Le fichier est peut-être manquant. Réessaie.'); }
        finally { setDownloading(null); }
    };
    return <section className="mb-6 rounded-xl border border-border-soft bg-card/40 p-4 min-w-0" aria-label="Documents de la candidature">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-text"><IoDocumentTextOutline className="text-accent text-lg" />Documents {!loading && <span className="text-xs text-text-3">({documents.length})</span>}</h2><button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-border-soft px-2 py-1.5 text-xs text-accent hover:border-accent"><IoAddOutline />Ajouter</button></div>
        {loading ? <p role="status" className="mt-3 text-xs text-text-3">Chargement…</p> : !documents.length && !error ? <p className="mt-3 text-xs text-text-3 leading-relaxed">Ajoute le CV, la lettre de motivation ou les autres pièces de cette candidature pour les retrouver ici.</p> : null}
        {error && <p role="alert" className="mt-3 text-xs text-red-500">{error} <button onClick={() => setAttempt(value => value + 1)} className="underline">Actualiser</button></p>}
        <ul className="mt-3 space-y-2 max-h-80 overflow-y-auto custom-scroll">
            {documents.map(item => <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border-soft bg-bg p-3">
                <IoDocumentTextOutline className="shrink-0 text-accent text-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-text break-words [overflow-wrap:anywhere]">{item.filename}</p><p className="mt-1 text-[11px] text-text-3">{documentTypeLabel(item.type)} · {new Date(item.uploaded_at).toLocaleDateString('fr-FR')}</p></div>
                <button onClick={() => download(item)} disabled={downloading !== null} title="Télécharger" aria-label={`Télécharger ${item.filename}`} className="shrink-0 rounded-md p-1.5 text-accent hover:bg-accent/10 disabled:opacity-50"><IoDownloadOutline /></button>
                <DeleteButton compact label={`le document « ${item.filename} »`} onDelete={async () => { await deleteDocument(item.id); setDocuments(previous => previous.filter(document => document.id !== item.id)); }} />
            </li>)}
        </ul>
        {uploadOpen && <UploadDocument application={application} onClose={() => setUploadOpen(false)} />}
    </section>;
}
