import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IoArrowForwardOutline, IoPeopleOutline } from "react-icons/io5";
import { getContacts } from "../../api/contacts";
import { companyContacts } from "../../utils/companyContacts";

export default function ApplicationContacts({ app, applications }) {
    const [state, setState] = useState({ loading: true, contacts: [], error: false });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        getContacts().then(({ data }) => {
            if (active) setState({ loading: false, contacts: data, error: false });
        }).catch(() => {
            if (active) setState({ loading: false, contacts: [], error: true });
        });
        return () => { active = false; };
    }, [attempt]);
    const contacts = companyContacts(state.contacts, app, applications);
    const href = `/contacts?application=${app.id}`;
    return (
        <section aria-label="Contacts de l’entreprise" className="mb-6 rounded-xl border border-border-soft bg-card/40 p-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
                <IoPeopleOutline className="text-accent shrink-0 text-lg" />
                <h2 className="text-sm font-semibold text-text">Contacts de l’entreprise</h2>
                {!state.loading && !state.error && <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{contacts.length}</span>}
            </div>
            {state.loading ? <p role="status" className="text-xs text-text-3">Chargement des contacts…</p>
                : state.error ? <div role="alert" className="text-xs text-text-2">Impossible de charger tes contacts.
                    <button onClick={() => { setState({ loading: true, contacts: [], error: false }); setAttempt((value) => value + 1); }} className="ml-2 text-accent underline">Réessayer</button>
                </div>
                : <>
                    <p className="text-xs text-text-3 leading-relaxed mb-3">
                        {contacts.length ? `Retrouve les coordonnées de tes contacts chez ${app.company || "cette entreprise"}.` : "Aucun contact lié à tes candidatures dans cette entreprise."}
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
                        {contacts.map((contact) => {
                            const methods = (contact.methods || []).filter((method) => method.value?.trim());
                            const primary = methods.find((method) => method.type === "email") || methods[0];
                            if (!primary) return null;
                            return <Link key={contact.id} to={`${href}&open=${contact.id}`} className="group flex items-center gap-3 rounded-lg border border-border-soft bg-bg px-3 py-3 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent transition-colors">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">{contact.name.slice(0, 2).toUpperCase()}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-text break-words">{contact.name}</span>
                                    <span className="block text-xs text-text-3 truncate">{primary.value}</span>
                                </span>
                                <IoArrowForwardOutline aria-hidden="true" className="shrink-0 text-accent" />
                            </Link>;
                        })}
                    </div>
                    <Link to={href} className="inline-flex items-center gap-2 mt-3 text-xs font-semibold text-accent hover:underline">
                        {contacts.length ? "Voir les contacts de l’entreprise" : "Ajouter ou lier un contact"}<IoArrowForwardOutline aria-hidden="true" />
                    </Link>
                </>}
        </section>
    );
}
