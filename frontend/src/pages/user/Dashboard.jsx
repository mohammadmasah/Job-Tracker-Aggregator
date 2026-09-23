import { useState } from "react";
import { useApplications } from "../../hooks/useApplications";
import { useContacts } from "../../hooks/useContacts";
import ApplicationForm from "../../components/applications/ApplicationForm";
import StatsCards from "../../components/stats/StatsCards";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import ApplicationsPipeline from "../../components/dashboard/ApplicationsPipeline";
import FollowUpList from "../../components/dashboard/FollowUpList";
import RecentApplications from "../../components/dashboard/RecentApplications";
import { createApplication } from "../../api/application";
import { createContact } from "../../api/contacts";
import { createContactMethod } from "../../api/contactMethod";
import { uploadDocument } from "../../api/document";

export default function Dashboard() {
    const { applications, loading, fetchApplications } = useApplications();
    const { contacts, fetchContacts } = useContacts();
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
                notes: contact.notes,
                application_id: applicationId
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
    await fetchContacts();
        setIsAddFormOpen(false);
    };

    if (loading) {
        return <p className="text-text-2 font-mono text-[12px] p-10">Chargement...</p>;
    }

    return (
        <div className="min-h-full bg-bg font-mono">
            <DashboardHeader onAddApplication={() => setIsAddFormOpen(true)} />

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

            <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 sm:px-8 sm:py-7">
                <StatsCards applications={applications} contacts={contacts} />
                <ApplicationsPipeline applications={applications} />
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
                    <RecentApplications applications={applications} />
                    <FollowUpList applications={applications} />
                </div>
            </div>
        </div>
    );
}