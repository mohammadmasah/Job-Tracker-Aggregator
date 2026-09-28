import { useRef, useState } from 'react';
import { IoTrashOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function DeleteButton({ onDelete, label, disabled = false }) {
    const pending = useRef(false);
    const [busy, setBusy] = useState(false);
    const remove = async (event) => {
        event.stopPropagation();
        if (pending.current || !window.confirm(`Supprimer ${label} ? Cette action est définitive.`)) return;
        pending.current = true;
        setBusy(true);
        try {
            await onDelete();
            toast.success('Suppression effectuée.');
        } catch {
            toast.error('Suppression impossible. Réessaie dans un instant.');
        } finally {
            pending.current = false;
            setBusy(false);
        }
    };
    return (
        <button type="button" onClick={remove} disabled={disabled || busy}
            aria-label={`Supprimer ${label}`} title={`Supprimer ${label}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-red-400/40 px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-500/10 disabled:opacity-50">
            <IoTrashOutline aria-hidden="true" />{busy ? 'Suppression…' : 'Supprimer'}
        </button>
    );
}
