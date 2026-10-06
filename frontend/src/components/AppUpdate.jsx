import { useEffect, useRef, useState } from 'react';

export default function AppUpdate() {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const restarting = useRef(false);
    const started = useRef(0);

    useEffect(() => {
        let active = true;
        const refresh = async () => {
            try {
                const response = await fetch('/api/local/update');
                if (!response.ok) throw new Error();
                const data = await response.json();
                if (!active) return;
                if (restarting.current && !['ready', 'restarting'].includes(data.phase)) {
                    restarting.current = false;
                    window.location.reload();
                    return;
                }
                setStatus(data);
                if (!restarting.current) setError('');
            } catch {
                if (active && (!restarting.current || Date.now() - started.current > 120000)) {
                    setError('TrackIt ne répond pas. Si le redémarrage est terminé, actualise la page ou ouvre à nouveau l’application.');
                }
            }
        };
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => { active = false; clearInterval(timer); };
    }, []);

    const action = async (name) => {
        setSending(true);
        setError('');
        if (name === 'install') {
            restarting.current = true;
            started.current = Date.now();
        }
        try {
            const response = await fetch(`/api/local/update/${name}`, { method: 'POST' });
            if (!response.ok) throw new Error();
            setStatus((previous) => ({ ...previous, phase: name === 'install' ? 'restarting' : name === 'check' ? 'checking' : 'downloading', message: name === 'install' ? 'Redémarrage en cours…' : 'Préparation…' }));
        } catch {
            restarting.current = false;
            setError('Impossible de lancer la mise à jour. Réessaie.');
        } finally { setSending(false); }
    };
    const busy = ['checking', 'downloading', 'preparing', 'restarting'].includes(status?.phase);
    const button = 'rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50';
    return <section className="rounded-xl border border-border-soft bg-panel p-5 space-y-3" aria-labelledby="app-update-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="app-update-title" className="font-bold">Mises à jour de TrackIt</h2>
            {status?.version && <span className="rounded-full border border-border-soft px-3 py-1 text-xs text-text-2">{status.version}</span>}
        </div>
        <p className="text-text-2">Télécharge la nouvelle version ici, puis redémarre en un clic. Tes candidatures, contacts, conversations et ton modèle IA sont conservés.</p>
        <p role="status" aria-live="polite">{status?.message || 'Chargement…'}{status?.available_version && status.phase === 'available' ? ` (${status.available_version})` : ''}</p>
        {['downloading', 'preparing'].includes(status?.phase) && <progress className="w-full accent-blue-500" value={status.progress || undefined} max="100" aria-label="Téléchargement de TrackIt" />}
        {status?.supported && !busy && status.phase !== 'ready' && <div className="flex flex-wrap gap-2">
            {status.phase === 'available' && <button className={button} disabled={sending} onClick={() => action('download')}>Télécharger la mise à jour</button>}
            <button className="rounded-lg border border-border-soft px-4 py-2 hover:bg-card disabled:opacity-50" disabled={sending} onClick={() => action('check')}>Vérifier les mises à jour</button>
        </div>}
        {status?.phase === 'ready' && <>
            <p className="text-text-2">Enregistre les formulaires ouverts avant de continuer. TrackIt se fermera brièvement ; cette page se rechargera automatiquement.</p>
            <button className={button} disabled={sending} onClick={() => action('install')}>Installer et redémarrer</button>
        </>}
        {status && !status.supported && <p className="text-text-2">Cette fonction est réservée à la version téléchargée de TrackIt.</p>}
        {error && <p role="alert" className="text-red-500">{error}</p>}
    </section>;
}
