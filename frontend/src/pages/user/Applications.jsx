import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useApplications } from "../../hooks/useApplications";
import ApplicationForm from "../../components/applications/ApplicationForm";
import ApplicationsList from "../../components/applications/ApplicationsList";
import { createApplication } from "../../api/application";
import { createContact } from "../../api/contacts";
import { createContactMethod } from "../../api/contactMethod";
import { uploadDocument } from "../../api/document";

const detectType = (v) =>
    v.includes("@") ? "email" : /^[\d\s+]+$/.test(v) ? "phone" : v.toLowerCase().includes("linkedin") ? "linkedin" : "other";

export default function Applications() {
    const { applications, loading, removeApplication, fetchApplications } = useApplications();
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [initialSelectedId, setInitialSelectedId] = useState(null);

    // Favoris (localStorage)
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem("favorites");
        return saved ? JSON.parse(saved) : [];
    });
    const toggleFavorite = (id) => {
        setFavorites((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            localStorage.setItem("favorites", JSON.stringify(next));
            return next;
        });
    };

    // Ouverture auto via ?open=<id> (lien depuis un contact)
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const openId = searchParams.get("open");
        if (openId && applications.length > 0) {
            setInitialSelectedId(Number(openId));
            searchParams.delete("open");
            setSearchParams(searchParams, { replace: true });
        }
    }, [applications, searchParams]);

    const handleCreate = async (data) => {
        const res = await createApplication(data.application);
        const applicationId = res.data.id;
        for (const contact of data.contacts) {
            const contactRes = await createContact({ name: contact.name, notes: contact.notes, application_id: applicationId });
            for (const info of contact.infos.filter((i) => i.trim())) {
                await createContactMethod(contactRes.data.id, { type: detectType(info), value: info });
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
        <div className="h-full bg-bg font-mono flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between px-8 h-[100px] border-b border-border-soft shrink-0">
                <div>
                    <h1 className="text-2xl font-extrabold uppercase text-text tracking-wide">Mes candidatures</h1>
                    <p className="text-[11px] text-text-3 mt-1">{applications.length} au total</p>
                </div>
                <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="text-[11px] text-bg bg-accent hover:bg-accent-2 px-5 py-2.5 rounded-[4px] tracking-wider uppercase transition-colors font-bold"
                >
                    + Nouvelle candidature
                </button>
            </div>

            {/* MAÎTRE-DÉTAIL */}
            <div className="flex-1 min-h-0">
                <ApplicationsList
                    applications={applications}
                    onRefresh={fetchApplications}
                    onDelete={removeApplication}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    initialSelectedId={initialSelectedId}
                />
            </div>

            {/* MODAL création */}
            {isAddFormOpen && (
                <div className="fixed inset-0 bg-bg/90 flex items-center justify-center z-50 p-4">
                    <div className="bg-panel border border-border rounded-[6px] w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scroll">
                        <div className="p-6">
                            <ApplicationForm onSubmit={handleCreate} onCancel={() => setIsAddFormOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}