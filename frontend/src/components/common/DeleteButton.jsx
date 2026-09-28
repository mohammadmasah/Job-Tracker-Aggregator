import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoTrashOutline, IoCloseOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

function DeleteConfirmation({ label, onDelete, onClose }) {
    const dialog = useRef(null);
    const pending = useRef(false);
    const titleId = useId();
    const descriptionId = useId();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);

    const remove = async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            await onDelete();
            toast.success('Suppression effectuée.');
            onClose();
        } catch {
            setError('Suppression impossible. Réessaie dans un instant.');
        } finally {
            pending.current = false;
            setBusy(false);
        }
    };

    return createPortal(
        <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
            onCancel={(event) => { event.preventDefault(); if (!pending.current) onClose(); }}
            onClick={(event) => {
                event.stopPropagation();
                if (event.target === event.currentTarget && !pending.current) onClose();
            }}
            className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md overflow-visible rounded-2xl border border-border-soft bg-panel p-0 text-text shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm">
            <div className="relative p-6 sm:p-7">
                <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer"
                    className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-text-3 hover:bg-card hover:text-text disabled:opacity-40">
                    <IoCloseOutline className="text-lg" />
                </button>
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                    <IoTrashOutline className="text-2xl" aria-hidden="true" />
                </div>
                <h2 id={titleId} className="text-lg font-bold">Confirmer la suppression</h2>
                <div id={descriptionId} className="mt-3 text-sm leading-relaxed text-text-2">
                    <p className="break-words">Veux-tu supprimer {label} ?</p>
                    <p className="mt-2 text-xs text-text-3">Cette action est définitive.</p>
                </div>
                {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
                <div className="mt-6 flex justify-end gap-2 border-t border-border-soft pt-5">
                    <button type="button" autoFocus onClick={onClose} disabled={busy}
                        className="rounded-lg border border-border-soft px-4 py-2 text-xs font-semibold hover:bg-card disabled:opacity-50">Annuler</button>
                    <button type="button" onClick={remove} disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        <IoTrashOutline aria-hidden="true" />{busy ? 'Suppression…' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </dialog>,
        document.body
    );
}

export default function DeleteButton({ onDelete, label, disabled = false, compact = false }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(true); }} disabled={disabled || open}
                aria-label={`Supprimer ${label}`} title={`Supprimer ${label}`} aria-haspopup="dialog"
                className={`inline-flex shrink-0 items-center justify-center rounded-md text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50 ${compact ? 'size-7' : 'gap-1.5 border border-red-400/30 px-2 py-1 text-[10px]'}`}>
                <IoTrashOutline className="text-[14px]" aria-hidden="true" />{!compact && 'Supprimer'}
            </button>
            {open && <DeleteConfirmation label={label} onDelete={onDelete} onClose={() => setOpen(false)} />}
        </>
    );
}
