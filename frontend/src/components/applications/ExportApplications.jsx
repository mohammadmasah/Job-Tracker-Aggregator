import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoCheckmarkCircleOutline, IoCloseOutline, IoDownloadOutline, IoGridOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { exportApplications } from '../../api/application';
import { STATUS_META, STATUS_ORDER } from '../../constants/status';

function ExportDialog({ applications, onClose }) {
    const dialog = useRef(null);
    const pending = useRef(false);
    const titleId = useId();
    const descriptionId = useId();
    const statusId = useId();
    const [status, setStatus] = useState('all');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const count = status === 'all' ? applications.length : applications.filter((item) => item.status === status).length;

    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);

    const download = async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            const response = await exportApplications(status);
            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = response.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1] || 'trackit-candidatures.xlsx';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            // Keep the object URL alive while the browser starts its download.
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
            toast.success('Ton fichier Excel est prêt. Téléchargement lancé.');
            onClose();
        } catch {
            setError('Le téléchargement a échoué. Vérifie ta connexion à TrackIt et réessaie.');
        } finally {
            pending.current = false;
            setBusy(false);
        }
    };

    return createPortal(
        <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
            onCancel={(event) => { event.preventDefault(); if (!pending.current) onClose(); }}
            onClick={(event) => { if (event.target === event.currentTarget && !pending.current) onClose(); }}
            className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-soft bg-panel p-0 text-text shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm">
            <div className="relative p-6 sm:p-7">
                <button type="button" aria-label="Fermer l’export" disabled={busy} onClick={onClose}
                    className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-text-3 hover:bg-card hover:text-text disabled:opacity-50">
                    <IoCloseOutline className="text-xl" />
                </button>
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <IoGridOutline className="text-2xl" aria-hidden="true" />
                </div>
                <h2 id={titleId} className="text-xl font-bold">Tes candidatures, en Excel</h2>
                <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-text-2">
                    Un bilan par statut et une liste détaillée, prêts à conserver ou à partager.
                </p>
                <div className="mt-5 rounded-xl border border-border-soft bg-card p-4">
                    <label htmlFor={statusId} className="mb-2 block text-xs font-semibold text-text-2">Candidatures à exporter</label>
                    <select id={statusId} autoFocus value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); setError(''); }}
                        className="w-full rounded-lg border border-border-soft bg-panel px-3 py-2.5 text-sm text-text focus:outline-2 focus:outline-accent disabled:opacity-50">
                        <option value="all">Toutes les candidatures ({applications.length})</option>
                        {STATUS_ORDER.map((key) => <option key={key} value={key}>{STATUS_META[key].label} ({applications.filter((item) => item.status === key).length})</option>)}
                    </select>
                    <p className="mt-2 text-xs text-text-3">Ce choix est indépendant des filtres de la liste. Les données sont relues au téléchargement.</p>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-text-2">
                    {['Synthèse : nombre de candidatures par statut', 'Détails : entreprise, poste, date et informations de l’offre', 'Contacts liés : noms, e-mails, téléphones et LinkedIn'].map((label) => (
                        <li key={label} className="flex gap-2"><IoCheckmarkCircleOutline className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" /><span>{label}</span></li>
                    ))}
                </ul>
                <p className="mt-4 text-xs text-text-3">Les descriptions et notes ne sont pas incluses.</p>
                <div role="status" aria-live="polite" className="mt-4 text-xs text-text-2">
                    {busy ? 'Préparation de ton fichier…' : `${count} candidature${count > 1 ? 's' : ''} dans cette sélection · Format .xlsx`}
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border-soft pt-5">
                    <button type="button" disabled={busy} onClick={onClose}
                        className="rounded-lg border border-border-soft px-4 py-2.5 text-xs font-semibold hover:bg-card disabled:opacity-50">Annuler</button>
                    <button type="button" disabled={busy || count === 0} onClick={download}
                        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <IoDownloadOutline aria-hidden="true" />{busy ? 'Préparation…' : 'Télécharger le fichier Excel'}
                    </button>
                </div>
            </div>
        </dialog>, document.body,
    );
}

export default function ExportApplications({ applications }) {
    const [open, setOpen] = useState(false);
    return <>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
            className="inline-flex min-h-10 items-center gap-2 rounded-[5px] border border-border-soft px-3 text-[11px] font-semibold text-text-2 transition-colors hover:border-accent hover:text-accent">
            <IoDownloadOutline className="text-base" aria-hidden="true" />Exporter Excel
        </button>
        {open && <ExportDialog applications={applications} onClose={() => setOpen(false)} />}
    </>;
}
