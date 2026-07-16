import { useState, useEffect } from "react";
import ContactList from "../../components/contacts/ContactList";
import ContactForm from "../../components/contacts/ContactForm";
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
            {/* HEADER */}
            <div className="flex items-center justify-between px-8 h-[100px] border-b border-border-soft shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase text-text tracking-wide">Contacts</h1>
                    <p className="text-[11px] text-text-3 mt-1">{contacts.length} au total</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}   // ← ouvre le modal
                    className="text-[11px] text-bg bg-accent hover:bg-accent-2 px-5 py-2.5 rounded-[4px] tracking-wider uppercase transition-colors font-bold"
                >
                    + Nouveau contact
                </button>
            </div>

            {/* MAÎTRE-DÉTAIL */}
            <div className="flex-1 min-h-0">
                <ContactList
                    contacts={contacts}
                    applications={applications}
                    onUpdated={fetchContacts}
                />
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