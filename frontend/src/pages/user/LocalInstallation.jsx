import { useEffect, useState } from 'react';
import AppUpdate from '../../components/AppUpdate';

export default function LocalInstallation() {
    const [runtime, setRuntime] = useState(null);
    const [error, setError] = useState('');
    const [stopped, setStopped] = useState(false);
    const [sending, setSending] = useState(false);
    useEffect(() => {
        if (stopped) return;
        let active = true;
        const refresh = async () => {
            try {
                const response = await fetch('/api/local/runtime');
                if (!response.ok) throw new Error();
                const data = await response.json();
                if (active) setRuntime(data);
            } catch { if (active) setError('Le service local ne répond pas.'); }
        };
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => { active = false; clearInterval(timer); };
    }, [stopped]);
    const activate = async () => {
        setSending(true);
        setError('');
        try {
            const response = await fetch('/api/local/runtime', { method: 'POST' });
            if (!response.ok) throw new Error();
            setRuntime({ phase: 'starting', message: 'Préparation en cours…', progress: 0 });
        } catch { setError("Impossible de lancer la préparation. Réessaie."); }
        finally { setSending(false); }
    };
    const quit = async () => {
        try {
            const response = await fetch('/api/local/quit', { method: 'POST' });
            if (!response.ok) throw new Error();
            setStopped(true);
        } catch { setError("Impossible d'arrêter TrackIt. Réessaie."); }
    };
    if (stopped) return <p className="text-sm text-text">TrackIt est arrêté. Tu peux fermer cet onglet. Tes données sont conservées.</p>;
    const working = runtime && !['idle', 'error', 'ready'].includes(runtime.phase);
    return <div className="space-y-6 text-sm text-text">
        <section className="rounded-xl border border-border-soft bg-panel p-5 space-y-3">
            <h2 className="text-lg font-bold">Ton installation locale</h2>
            <p className="text-text-2">Tes candidatures, contacts et documents restent sur cet ordinateur. Aucun Docker ni logiciel de développement n'est nécessaire.</p>
        </section>
        <AppUpdate />
        <section className="rounded-xl border border-border-soft bg-panel p-5 space-y-3">
            <h2 className="font-bold">Poulpie · IA locale</h2>
            <p className="text-text-2">Active l'assistant pour télécharger automatiquement son moteur et Qwen3 1.7B, un modèle léger d’environ 1,4 Go. Prévois une connexion Internet, environ 3 Go de téléchargement et au moins 6 Go d'espace libre. Après préparation, le chat fonctionne localement.</p>
            <p role="status">{runtime?.message || 'Chargement…'}</p>
            {working && <progress className="w-full accent-blue-500" value={runtime.progress || undefined} max="100" aria-label="Préparation de l’IA" />}
            {runtime && ['idle', 'error'].includes(runtime.phase) && <button disabled={sending} onClick={activate} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">{sending ? 'Préparation…' : "Activer l’IA locale"}</button>}
        </section>
        {error && <p role="alert" className="text-red-500">{error}</p>}
        <button onClick={quit} className="rounded-lg border border-border-soft px-4 py-2 hover:bg-card">Arrêter TrackIt</button>
        <p className="text-xs text-text-3">Fermer le navigateur ne ferme pas le service local. Utilise ce bouton pour l'arrêter, puis relance TrackIt pour revenir.</p>
    </div>;
}
