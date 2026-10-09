import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { IoCheckmarkCircleOutline, IoCloudOutline, IoDesktopOutline, IoKeyOutline } from 'react-icons/io5';

const services = [
    { id: 'local', name: 'Ollama', detail: 'Sur ton ordinateur', icon: IoDesktopOutline },
    { id: 'openai', name: 'OpenAI', detail: 'Ta clé API', icon: IoCloudOutline },
    { id: 'gemini', name: 'Gemini', detail: 'Ta clé API Google', icon: IoCloudOutline },
    { id: 'claude', name: 'Claude', detail: 'Ta clé API Anthropic', icon: IoCloudOutline },
];
const guides = {
    openai: 'https://platform.openai.com/api-keys',
    gemini: 'https://aistudio.google.com/apikey',
    claude: 'https://platform.claude.com/settings/keys',
};
const aiLabel = (settings) => settings ? `${settings.provider === 'local' ? 'Local · Ollama' : services.find(s => s.id === settings.provider)?.name || settings.provider} · ${settings.model}` : 'Assistant IA';

export default function AssistantSettings() {
    const [settings, setSettings] = useState(null);
    const [provider, setProvider] = useState('local');
    const [models, setModels] = useState([]);
    const [model, setModel] = useState('');
    const [key, setKey] = useState('');
    const [consent, setConsent] = useState(false);
    const [receipt, setReceipt] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        axios.get('/api/ai/settings').then(({ data }) => {
            if (!active) return;
            setSettings(data); setProvider(data.provider); setModel(data.model);
        }).catch(() => { if (active) setError('Impossible de charger tes réglages IA.'); });
        return () => { active = false; };
    }, [attempt]);

    const resetTest = () => { setReceipt(''); setNotice(''); setError(''); };
    const choose = (id) => {
        setProvider(id); setModel(settings.profiles[id]?.model || ''); setKey(''); setConsent(false);
        setConfirmDelete(false); setModels([]); resetTest();
    };
    const saved = settings?.profiles[provider]?.has_key;
    const payload = { provider, model: provider === 'local' ? '' : model.trim(), api_key: key || null, consent, receipt };
    const update = (data) => {
        setSettings(data); setKey(''); setReceipt('');
        window.dispatchEvent(new Event('trackit-ai-changed'));
    };
    const perform = async (action) => {
        setBusy(action); setError(''); setNotice('');
        try {
            const { data } = action === 'delete'
                ? await axios.delete(`/api/ai/providers/${provider}`)
                : await axios.post(`/api/ai/${action}`, payload, { timeout: 75000 });
            if (action === 'models') { setModels(data.models); setReceipt(''); setNotice('Choisis un modèle, puis teste la connexion pour vérifier ton accès et ton quota.'); }
            else if (action === 'test') { setReceipt(data.receipt); setNotice(data.message); }
            else { update(data); setNotice(action === 'delete' ? 'Clé supprimée. Si ce service était actif, Ollama est maintenant sélectionné.' : 'Assistant activé. Tes prochains messages utiliseront ce service.'); }
            setConfirmDelete(false);
        } catch (err) {
            setReceipt('');
            setError(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Opération impossible. Vérifie ta connexion et réessaie.');
        } finally { setBusy(''); }
    };
    const input = 'w-full rounded-lg border border-border-soft bg-bg px-3 py-3 text-sm text-text focus:outline-none focus:border-accent disabled:opacity-50';
    if (!settings) return <div role="status" className="text-sm text-text-2">{error || 'Chargement des réglages…'}{error && <button className="ml-3 text-accent underline" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Réessayer</button>}</div>;
    return <div className="space-y-6 pb-8">
        <header>
            <h2 className="text-xl font-bold text-text">Ton assistant, ton choix</h2>
            <p className="mt-2 text-sm text-text-3 leading-relaxed">Garde l’IA sur ton ordinateur ou connecte le service de ton choix. Tes conversations restent dans TrackIt.</p>
        </header>
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <IoCheckmarkCircleOutline className="text-accent text-xl shrink-0 mt-0.5" />
            <div className="min-w-0"><p className="text-xs text-text-3">Assistant actif</p><p className="text-sm font-semibold text-text break-words mt-1">{aiLabel(settings)}</p></div>
        </div>
        <fieldset disabled={Boolean(busy)}>
            <legend className="text-xs font-semibold text-text-2 mb-3">1 · Choisis ton service</legend>
            <div className="grid grid-cols-2 gap-3">
                {services.map(({ id, name, detail, icon: Icon }) => <button key={id} type="button" onClick={() => choose(id)} aria-pressed={provider === id} className={`text-left rounded-xl border p-4 transition-colors disabled:opacity-60 ${provider === id ? 'border-accent bg-accent/10' : 'border-border-soft bg-card hover:border-accent/50'}`}>
                    <Icon className="text-xl text-accent mb-3" /><span className="block text-sm font-semibold text-text">{name}</span><span className="block text-xs text-text-3 mt-1">{detail}</span>
                </button>)}
            </div>
        </fieldset>
        {provider === 'local' ? <section className="rounded-xl border border-border-soft bg-card p-5 space-y-4">
            <h3 className="font-semibold text-text text-sm">Une IA locale avec Ollama</h3>
            <p className="text-xs leading-relaxed text-text-2">Aucune clé API nécessaire. Ton ordinateur doit pouvoir exécuter Ollama et son modèle. Passer en mode local ne supprime pas tes clés enregistrées.</p>
            {import.meta.env.VITE_STANDALONE === '1' && <Link className="block text-xs text-accent underline" to="/settings/local">Installer ou préparer Ollama →</Link>}
            <div className="flex flex-wrap gap-3"><button disabled={Boolean(busy)} onClick={() => perform('test')} className="rounded-lg border border-border-soft px-4 py-2.5 text-xs text-text disabled:opacity-50">{busy === 'test' ? 'Test en cours…' : 'Tester Ollama'}</button>
                <button disabled={Boolean(busy) || settings.provider === 'local'} onClick={() => perform('activate')} className="rounded-lg bg-accent px-4 py-2.5 text-xs text-white font-semibold disabled:opacity-50">{busy === 'activate' ? 'Activation…' : settings.provider === 'local' ? 'Ollama est actif' : 'Utiliser Ollama'}</button></div>
        </section> : <section className="rounded-xl border border-border-soft bg-card p-5 space-y-4">
            <h3 className="text-xs font-semibold text-text-2">2 · Configure ta connexion</h3>
            <label className="block text-xs text-text-2">Clé API {saved && <span className="text-accent">· déjà enregistrée</span>}
                <input type="password" autoComplete="off" spellCheck={false} value={key} disabled={Boolean(busy)} onChange={e => { setKey(e.target.value); setModels([]); resetTest(); }} placeholder={saved ? 'Laisse vide pour conserver ta clé' : 'Colle ta clé API ici'} className={`${input} mt-2`} />
            </label>
            <p className="text-xs text-text-3 flex gap-2"><IoKeyOutline className="shrink-0" />Clé chiffrée côté serveur, jamais réaffichée.</p>
            <a href={guides[provider]} target="_blank" rel="noreferrer" className="inline-block text-xs text-accent underline">Obtenir une clé API ↗</a>
            {provider === 'gemini' && <div className="space-y-3 rounded-lg border border-border-soft bg-bg p-3">
                <button disabled={Boolean(busy) || (!key.trim() && !saved)} onClick={() => perform('models')} className="text-xs font-semibold text-accent underline disabled:opacity-50">{busy === 'models' ? 'Chargement des modèles…' : 'Charger les modèles Gemini'}</button>
                <p className="text-xs text-text-3 leading-relaxed">La liste est demandée à Google avec ta clé. Aucun message ni document n’est envoyé.</p>
                {models.length > 0 && <label className="block text-xs text-text-2">Choisis un modèle
                    <select value={models.some(item => item.id === model) ? model : ''} disabled={Boolean(busy)} onChange={e => { setModel(e.target.value); resetTest(); }} className={`${input} mt-2`}>
                        <option value="">Sélectionner un modèle…</option>
                        {models.map(item => <option key={item.id} value={item.id}>{item.name} — {item.id}</option>)}
                    </select>
                </label>}
            </div>}
            <label className="block text-xs text-text-2">Identifiant du modèle
                <input value={model} disabled={Boolean(busy)} onChange={e => { setModel(e.target.value); resetTest(); }} placeholder={provider === 'gemini' ? 'Choisis un modèle dans la liste ci-dessus' : 'Identifiant exact fourni par le service'} className={`${input} mt-2`} />
            </label>
            <p className="text-xs leading-relaxed text-text-3">Utilise un modèle de conversation accessible avec ta clé. Vérifie les conditions et le crédit API auprès du fournisseur ; ton abonnement au chatbot ne garantit pas cet accès.</p>
            <label className="flex items-start gap-3 rounded-lg border border-border-soft bg-bg p-3 text-xs text-text-2 leading-relaxed">
                <input type="checkbox" checked={consent} disabled={Boolean(busy)} onChange={e => { setConsent(e.target.checked); resetTest(); }} className="mt-1 shrink-0 accent-[var(--accent)]" />
                <span>J’accepte l’envoi de mes messages, de l’historique utile, du contenu des PDF joints et du contexte de mon espace (candidatures, contacts et offres) à ce service. L’usage de l’API peut être facturé par le fournisseur.</span>
            </label>
            <p className="text-xs text-text-3">Le test envoie uniquement « Reply only OK. », sans tes données. Il peut consommer un peu de crédit API.</p>
            <div className="flex flex-wrap gap-3">
                <button disabled={Boolean(busy) || !consent || !model.trim() || (!key.trim() && !saved)} onClick={() => perform('test')} className="rounded-lg border border-border-soft px-4 py-2.5 text-xs text-text disabled:opacity-50">{busy === 'test' ? 'Test en cours…' : 'Tester la connexion'}</button>
                <button disabled={Boolean(busy) || !receipt || !consent} onClick={() => perform('activate')} className="rounded-lg bg-accent px-4 py-2.5 text-xs text-white font-semibold disabled:opacity-50">{busy === 'activate' ? 'Activation…' : 'Activer cet assistant'}</button>
            </div>
            {saved && <div className="border-t border-border-soft pt-4">
                {!confirmDelete ? <button disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)} className="text-xs text-text-3 underline">Supprimer la clé enregistrée</button> : <div className="rounded-lg bg-bg p-3 text-xs text-text-2 space-y-3"><p>Supprimer cette clé ? Si ce service est actif, TrackIt repassera sur Ollama.</p><div className="flex gap-4"><button disabled={Boolean(busy)} onClick={() => perform('delete')} className="text-red-500 font-semibold">Confirmer la suppression</button><button disabled={Boolean(busy)} onClick={() => setConfirmDelete(false)}>Annuler</button></div></div>}
            </div>}
        </section>}
        {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-500 leading-relaxed">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-xs text-text leading-relaxed">{notice}</p>}
        <p className="text-xs text-text-3 leading-relaxed">Aucun changement automatique de service en cas d’erreur. Tu gardes le contrôle et peux revenir à Ollama à tout moment.</p>
    </div>;
}
