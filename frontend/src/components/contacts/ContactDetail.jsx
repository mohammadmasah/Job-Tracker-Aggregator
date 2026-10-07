import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    IoPersonOutline, IoMailOutline, IoCallOutline, IoLogoLinkedin, IoLinkOutline,
    IoCopyOutline, IoPencilOutline, IoCloseOutline, IoAddOutline,
    IoArrowBack, IoArrowForward, IoBusinessOutline, IoDocumentTextOutline,
} from 'react-icons/io5';
import DeleteButton from '../common/DeleteButton';
import { METHOD_COLORS, STATUS_META } from '../../constants/status';
import { updateContact, deleteContact, linkApplication, unlinkApplication } from '../../api/contacts';
import { createContactMethod, deleteContactMethod } from '../../api/contactMethod';

const TYPES = {
    email: { label: 'E-mail', Icon: IoMailOutline },
    phone: { label: 'Téléphone', Icon: IoCallOutline },
    linkedin: { label: 'LinkedIn', Icon: IoLogoLinkedin },
    other: { label: 'Autre coordonnée', Icon: IoLinkOutline },
};
const inputClass = 'w-full min-w-0 rounded-lg border border-border-soft bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50';
const iconButton = 'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-card hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40';
const actionButton = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border-soft px-3 py-2 text-xs font-semibold text-text-2 hover:bg-card disabled:opacity-50';

function contactHref(method) {
    const value = method.value.trim();
    if (method.type === 'email') return `mailto:${encodeURIComponent(value)}`;
    if (method.type === 'phone') return `tel:${value.replace(/[^\d+*#,;]/g, '')}`;
    try {
        const url = new URL(/^(www\.|linkedin\.com\/)/i.test(value) ? `https://${value}` : value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
}

function Section({ id, title, count, action, children }) {
    return <section aria-labelledby={id} className="min-w-0 rounded-xl border border-border-soft bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-4 py-3 sm:px-5">
            <h3 id={id} className="flex items-center gap-2 text-sm font-semibold text-text">{title}
                {count !== undefined && <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-text-3">{count}</span>}
            </h3>
            {action}
        </div>
        <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>;
}

export default function ContactDetail({ contact, apps = [], allApplications = [], onRefresh, onDeleted, onBack }) {
    const [editingName, setEditingName] = useState(false);
    const [name, setName] = useState(contact.name);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState(contact.notes || '');
    const [addingLink, setAddingLink] = useState(false);
    const [applicationId, setApplicationId] = useState('');
    const [newMethod, setNewMethod] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);
    const methods = contact.methods || [];
    const linkable = allApplications.filter((app) => !apps.some((linked) => linked.id === app.id));
    const words = contact.name.trim().split(/\s+/);
    const initials = words.length > 1 ? words[0][0] + words.at(-1)[0] : (words[0] || '?').slice(0, 2);

    const run = async (action, { deleted = false, propagate = false } = {}) => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            await action();
            if (deleted) await onDeleted();
            else await onRefresh();
        } catch (failure) {
            setError('Impossible d’enregistrer cette modification. Réessaie dans un instant.');
            if (propagate) throw failure;
        } finally {
            pending.current = false;
            setBusy(false);
        }
    };
    const saveName = (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        run(async () => { await updateContact(contact.id, { name: name.trim() }); setEditingName(false); });
    };
    const addMethod = (event) => {
        event.preventDefault();
        const value = newMethod.trim();
        if (!value) return;
        const type = value.includes('@') ? 'email' : /^[\d\s+().-]+$/.test(value) ? 'phone' : /linkedin\.com/i.test(value) ? 'linkedin' : 'other';
        run(async () => { await createContactMethod(contact.id, { type, value }); setNewMethod(''); });
    };
    const copy = async (value) => {
        try { await navigator.clipboard.writeText(value); toast.success('Coordonnée copiée.'); }
        catch { toast.error('Copie impossible. Tu peux sélectionner le texte pour le copier.'); }
    };

    return <div className="mx-auto w-full min-w-0 max-w-4xl p-4 sm:p-6 xl:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-medium text-text-3 hover:text-text"><IoArrowBack />Retour aux contacts</button>
            <div className="flex items-center gap-1">
                <DeleteButton compact disabled={busy} label={`le contact « ${contact.name} » et ses coordonnées`}
                    onDelete={() => run(() => deleteContact(contact.id), { deleted: true, propagate: true })} />
                <button type="button" onClick={onBack} className={iconButton} aria-label="Fermer la fiche contact" title="Fermer"><IoCloseOutline className="text-xl" /></button>
            </div>
        </div>

        <header className="mb-6 flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-lg font-bold text-accent sm:size-16">{initials.toUpperCase()}</div>
            <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-text-3">Fiche contact</p>
                {editingName ? <form onSubmit={saveName} className="space-y-2">
                    <label className="sr-only" htmlFor="contact-name">Nom du contact</label>
                    <input id="contact-name" autoFocus required value={name} disabled={busy} onChange={(event) => setName(event.target.value)} className={inputClass} />
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy || !name.trim()} className={actionButton}>Enregistrer</button>
                        <button type="button" disabled={busy} className={actionButton} onClick={() => setEditingName(false)}>Annuler</button>
                    </div>
                </form> : <div className="flex min-w-0 items-start gap-2">
                    <h2 className="min-w-0 text-xl font-bold leading-snug text-text [overflow-wrap:anywhere] sm:text-2xl">{contact.name}</h2>
                    <button type="button" disabled={busy} className={iconButton} aria-label="Modifier le nom" title="Modifier le nom" onClick={() => { setName(contact.name); setEditingName(true); }}><IoPencilOutline /></button>
                </div>}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-text-3"><IoPersonOutline className="shrink-0" />{apps.length ? `${apps.length} candidature${apps.length > 1 ? 's' : ''} liée${apps.length > 1 ? 's' : ''}` : 'Contact indépendant'}</p>
            </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">{error}</p>}
        <div className="space-y-5">
            <Section id="contact-coordinates" title="Coordonnées" count={methods.length}>
                <div className="space-y-2">
                    {!methods.length && <p className="rounded-lg bg-bg p-4 text-sm text-text-3">Ajoute un e-mail, un téléphone ou un profil pour retrouver ce contact facilement.</p>}
                    {methods.map((method) => {
                        const { label, Icon } = TYPES[method.type] || TYPES.other;
                        const color = METHOD_COLORS[method.type] || 'var(--text-3)';
                        const href = contactHref(method);
                        return <div key={method.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-border-soft bg-bg p-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}><Icon className="text-base" /></span>
                            <div className="min-w-0 flex-1">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-3">{label}</p>
                                {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block text-sm leading-relaxed text-text [overflow-wrap:anywhere] hover:text-accent hover:underline">{method.value}</a>
                                    : <p className="text-sm leading-relaxed text-text [overflow-wrap:anywhere]">{method.value}</p>}
                            </div>
                            <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row">
                                <button type="button" onClick={() => copy(method.value)} className={iconButton} title={`Copier : ${method.value}`} aria-label={`Copier ${method.value}`}><IoCopyOutline /></button>
                                <DeleteButton compact disabled={busy} label={`la coordonnée « ${method.value} »`} onDelete={() => run(() => deleteContactMethod(method.id), { propagate: true })} />
                            </div>
                        </div>;
                    })}
                </div>
                <form onSubmit={addMethod} className="mt-4 border-t border-border-soft pt-4">
                    <label htmlFor="contact-new-method" className="mb-2 block text-xs font-medium text-text-2">Ajouter une coordonnée</label>
                    <div className="flex min-w-0 gap-2">
                        <input id="contact-new-method" value={newMethod} disabled={busy} onChange={(event) => setNewMethod(event.target.value)} placeholder="E-mail, téléphone ou lien…" className={`${inputClass} flex-1`} />
                        <button type="submit" disabled={busy || !newMethod.trim()} aria-label="Ajouter la coordonnée" title="Ajouter" className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-2 disabled:opacity-40"><IoAddOutline className="text-xl" /></button>
                    </div>
                </form>
            </Section>

            <Section id="contact-applications" title="Candidatures liées" count={apps.length}
                action={!addingLink && linkable.length > 0 && <button type="button" disabled={busy} onClick={() => setAddingLink(true)} className={actionButton}><IoAddOutline />Lier une candidature</button>}>
                {addingLink && <form onSubmit={(event) => {
                    event.preventDefault();
                    if (applicationId) run(async () => { await linkApplication(contact.id, Number(applicationId)); setAddingLink(false); setApplicationId(''); });
                }} className="mb-4 space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                    <label htmlFor="contact-application" className="block text-xs font-medium text-text-2">Choisir une candidature</label>
                    <select id="contact-application" autoFocus required disabled={busy} value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className={inputClass}>
                        <option value="">Sélectionner…</option>
                        {linkable.map((app) => <option key={app.id} value={app.id}>{app.company} — {app.position}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy || !applicationId} className={actionButton}>Lier</button>
                        <button type="button" disabled={busy} onClick={() => { setAddingLink(false); setApplicationId(''); }} className={actionButton}>Annuler</button>
                    </div>
                </form>}
                <div className="space-y-3">
                    {!apps.length && <p className="text-sm leading-relaxed text-text-3">Aucune candidature liée à ce contact.</p>}
                    {apps.map((app) => {
                        const status = STATUS_META[app.status];
                        return <article key={app.id} className="min-w-0 rounded-lg border border-border-soft bg-bg p-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-soft bg-card text-accent"><IoBusinessOutline className="text-lg" /></div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-text [overflow-wrap:anywhere]">{app.company}</h4>
                                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-2 [overflow-wrap:anywhere]" title={app.position}>{app.position}</p>
                                    {status && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border-soft px-2 py-0.5 text-[11px] text-text-2"><span className="size-1.5 rounded-full" style={{ backgroundColor: status.color }} />{status.label}</span>}
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-3">
                                <Link to={`/applications?open=${app.id}`} className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline">Voir la candidature<IoArrowForward /></Link>
                                <button type="button" disabled={busy} onClick={() => run(() => unlinkApplication(contact.id, app.id))} className="rounded-md px-2 py-1 text-xs text-text-3 hover:bg-card hover:text-text disabled:opacity-40" aria-label={`Délier la candidature ${app.company} — ${app.position}`}>Délier</button>
                            </div>
                        </article>;
                    })}
                </div>
            </Section>

            <Section id="contact-notes" title="Notes" action={!editingNotes && <button type="button" disabled={busy} className={actionButton} onClick={() => { setNotes(contact.notes || ''); setEditingNotes(true); }}><IoPencilOutline />{contact.notes ? 'Modifier' : 'Ajouter'}</button>}>
                {editingNotes ? <form onSubmit={(event) => { event.preventDefault(); run(async () => { await updateContact(contact.id, { notes: notes.trim() || null }); setEditingNotes(false); }); }} className="space-y-3">
                    <label htmlFor="contact-notes-input" className="sr-only">Notes sur le contact</label>
                    <textarea id="contact-notes-input" autoFocus disabled={busy} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} resize-y`} placeholder="Échanges, points à retenir, prochaine prise de contact…" />
                    <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className={actionButton}>Enregistrer</button><button type="button" disabled={busy} className={actionButton} onClick={() => setEditingNotes(false)}>Annuler</button></div>
                </form> : contact.notes ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-2 [overflow-wrap:anywhere]">{contact.notes}</p>
                    : <p className="flex items-start gap-2 text-sm leading-relaxed text-text-3"><IoDocumentTextOutline className="mt-0.5 shrink-0" />Garde ici les informations utiles pour tes prochains échanges.</p>}
            </Section>
        </div>
    </div>;
}
