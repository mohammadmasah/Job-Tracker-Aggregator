const companyKey = (name) => (name || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

// Company membership comes from linked applications, never from a contact's name.
export function companyContacts(contacts, application, applications) {
    if (!application) return [];
    const company = companyKey(application.company);
    const ids = new Set([application.id, ...applications
        .filter((item) => company && companyKey(item.company) === company)
        .map((item) => item.id)]);
    const seen = new Set();
    return contacts.filter((contact) => {
        if (seen.has(contact.id) || !contact.application_ids?.some((id) => ids.has(id))) return false;
        seen.add(contact.id);
        return true;
    }).sort((a, b) => Number(b.application_ids.includes(application.id)) - Number(a.application_ids.includes(application.id))
        || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}
