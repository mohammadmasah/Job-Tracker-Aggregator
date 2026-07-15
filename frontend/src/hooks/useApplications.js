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
        fetchApplications();
    }, []);

    const addApplication = async (data) => {
        await createApplication(data);
        fetchApplications();
    }

    const removeApplication = async (id) => {
        await deleteApplication(id);
        fetchApplications();
    }

    return { applications, loading, addApplication, removeApplication, fetchApplications };
}