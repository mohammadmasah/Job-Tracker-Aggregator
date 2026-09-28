"""Render explicit contact-profile requests with a consistent user-facing format."""
import re
import unicodedata


def normalize(text):
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.translate(str.maketrans({"ي": "ی", "ك": "ک", "‌": " ", "’": "'"}))
    return " ".join(text.strip(" ?.؟!").split())


def answer_contact_profile(question, snapshot):
    text = normalize(question)
    patterns = {
        "fr": r"(?:(?:donne[- ]moi|montre[- ]moi|affiche) )?(?:toutes? )?(?:les? )?(?:informations|infos|details|coordonnees|fiche)(?: completes?)? (?:de|sur|du contact) (.+)",
        "en": r"(?:(?:give me|show me|show) )?(?:all |the )?(?:details|information|contact details|profile) (?:for|about|of) (.+)",
        "fa": r"(?:تمام |همه |همه ی )?(?:مشخصات|مشخاصات|اطلاعات|معلومات) (.+?)(?: را)?(?: بده| بدی| نشان بده| نمایش بده)?",
    }
    language, name = None, None
    for lang, pattern in patterns.items():
        match = re.fullmatch(pattern, text)
        if match:
            language, name = lang, match.group(1)
            break
    if not name:
        return None
    contacts = [contact for contact in snapshot.get("contacts", []) if normalize(contact["name"]) == normalize(name)]
    # Let the assistant clarify missing or ambiguous names instead of guessing.
    if len(contacts) != 1:
        return None
    labels = {
        "fr": {"email": "Email", "phone": "Téléphone", "linkedin": "LinkedIn", "other": "Coordonnée", "notes": "Notes", "applications": "Candidatures liées"},
        "en": {"email": "Email", "phone": "Phone", "linkedin": "LinkedIn", "other": "Contact", "notes": "Notes", "applications": "Linked applications"},
    }["en" if language == "en" else "fr"]
    contact = contacts[0]
    lines = [f"**{contact['name']}**"]
    for method in contact.get("methods", []):
        if method.get("value") and method["value"].strip():
            label = labels.get(method.get("type"), labels["other"])
            lines.append(f"- {label} : {method['value'].strip()}")
    if contact.get("notes") and contact["notes"].strip():
        lines.append(f"- {labels['notes']} : {contact['notes'].strip()}")
    linked_ids = set(contact.get("application_ids", []))
    applications = [" — ".join(filter(None, [app.get("company"), app.get("position")]))
                    for app in snapshot.get("applications", []) if app.get("id") in linked_ids]
    applications = [app for app in applications if app]
    if applications:
        lines.append(f"- {labels['applications']} : " + "; ".join(applications))
    return "\n".join(lines)
