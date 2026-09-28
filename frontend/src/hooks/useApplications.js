import { useEffect, useState } from "react";
import { getApplications, createApplication, deleteApplication } from "../api/application";

export function useApplications() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchApplications = async () => {
        try {
            const res = await getApplications();
            setApplications(res.data);
        } catch (error) {
            console.error("Erreur de chargement", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        getApplications().then((res) => { if (active) setApplications(res.data); })
            .catch((error) => console.error("Erreur de chargement", error))
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const addApplication = async (data) => {
        await createApplication(data);
        fetchApplications();
    }

    const removeApplication = async (id) => {
        await deleteApplication(id);
        setApplications((previous) => previous.filter((application) => application.id !== id));
    }

    return { applications, loading, addApplication, removeApplication, fetchApplications };
}