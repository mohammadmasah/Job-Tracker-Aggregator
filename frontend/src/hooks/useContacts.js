import { useState, useEffect } from "react";
import { getContacts } from "../api/contacts";

export function useContacts() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return { contacts, loading, fetchContacts };
}