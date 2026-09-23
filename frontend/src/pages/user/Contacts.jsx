import { useState, useEffect } from "react";
import ContactList from "../../components/contacts/ContactList";
import ContactForm from "../../components/contacts/ContactForm";
import PageHeader from "../../components/layout/PageHeader";
import { getContacts } from "../../api/contacts";
import { useApplications } from "../../hooks/useApplications";

export default function Contacts() {
    const { applications } = useApplications();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);   // ← état du modal

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await getContacts();
            setContacts(res.data);
        } catch (e) {
            console.error("Erreur chargement contacts", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    return (
        <div className="h-full bg-bg font-mono flex flex-col">
            <PageHeader
                title="Contacts"
                description={`${contacts.length} contact${contacts.length > 1 ? "s" : ""} dans votre réseau.`}
                actions={<button onClick={() => setIsFormOpen(true)} className="min-h-10 rounded-[5px] bg-accent px-4 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-2">Nouveau contact</button>}
            />

            {/* MAÎTRE-DÉTAIL */}
            <div className="flex-1 min-h-0">
                <ContactList contacts={contacts} applications={applications} onUpdated={fetchContacts} />
            </div>

            {/* MODAL de création */}
            {isFormOpen && (
                <ContactForm
                    applications={applications}
                    onClose={() => setIsFormOpen(false)}
                    onCreated={fetchContacts}
                />
            )}
        </div>
    );
}