import { useState } from "react";
import { useApplications } from "../../hooks/useApplications";
import { useContacts } from "../../hooks/useContacts";
import ApplicationForm from "../../components/ApplicationForm";
import StatsCards from "../../components/StatsCards";
import { createApplication } from "../../api/application";
import { createContact } from "../../api/contacts";
import { createContactMethod } from "../../api/contactMethod";
import { uploadDocument } from "../../api/document";

const statusLabels = {
    to_apply: "À postuler",
    applied: "Postulé",
    interview: "Entretien",
    technical_test: "Test technique",
    offer: "Offre",
    accepted: "Accepté",
    rejected: "Refusé",
};

export default function Dashboard() {
    const { applications, loading, removeApplication, fetchApplications } = useApplications();
    const { contacts } = useContacts();
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);

    const detectType = (value) => {
        if (value.includes("@")) return "email";
        if (/^[\d\s+]+$/.test(value)) return "phone";
        if (value.includes("linkedin")) return "linkedin";
        return "other";
    };

    const handleCreate = async (data) => {
        const res = await createApplication(data.application);
        const applicationId = res.data.id;

        for (const contact of data.contacts) {
            const contactRes = await createContact({
                name: contact.name,
                application_id: applicationId,
            });
            const contactId = contactRes.data.id;

            for (const info of contact.infos.filter((i) => i.trim())) {
                await createContactMethod(contactId, {
                    type: detectType(info),
                    value: info,
                });
            }
        }

        for (const file of data.files || []) {
            await uploadDocument(applicationId, file);
        }

        await fetchApplications();
        setIsAddFormOpen(false);
    };

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    return (
        <div className="min-h-full bg-bg font-mono">
            {/* HEADER */}
            <div className="flex justify-between h-[100px] border-b border-border-soft items-center px-8">
                <div>
                    <h1 className="font-extrabold text-2xl uppercase text-text tracking-wide">Tableau de bord</h1>
                    <span className="text-[11px] text-text-3">Vue d'ensemble</span>
                </div>

                <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="px-5 py-2.5 text-[11px] font-bold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase rounded-[4px] transition-colors"
                >
                    + Nouvelle candidature
                </button>
            </div>

            {/* MODAL formulaire */}
            {isAddFormOpen && (
                <div className="fixed inset-0 bg-bg/90 flex items-center justify-center z-50">
                    <div className="bg-panel border border-border rounded-[6px] w-full max-w-3/4 max-h-[85vh] overflow-y-auto custom-scroll">
                        <div className="p-6">
                            <ApplicationForm
                                onSubmit={handleCreate}
                                onCancel={() => setIsAddFormOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENU */}
            <div className="px-8 py-6 flex flex-col gap-6">
                {/* CARTES STATS */}
                <StatsCards applications={applications} contacts={contacts} />
            </div>
        </div>
    );
}