"""Answer simple unfiltered count questions from exact database totals."""
import re
import unicodedata


def answer_count_question(question, summary):
    text = unicodedata.normalize("NFKD", question.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.translate(str.maketrans({"ي": "ی", "ك": "ک", "‌": " ", "’": "'"}))
    text = re.sub(r"[?؟.!]", "", text)
    text = " ".join(text.split())
    # Full matches deliberately leave filtered/complex questions to the model.
    fa = re.fullmatch(r"(?:من )?چند(?: تا)? (کاندید|کاندیدا|درخواست کاری|درخواست کار|درخواست|مخاطب|کانتکت|فرصت شغلی|سند|فایل)(?: (دارم|کردم|ثبت کردم|ارسال کردم))?", text)
    if fa:
        noun, verb = fa.groups()
        if noun in {"کاندید", "کاندیدا", "درخواست کاری", "درخواست کار", "درخواست"}:
            key = "submitted_applications" if verb in {"کردم", "ارسال کردم"} else "total_applications"
            label = "درخواست کاری"
        else:
            key, label = {"مخاطب": ("total_contacts", "مخاطب"), "کانتکت": ("total_contacts", "مخاطب"),
                          "فرصت شغلی": ("total_job_offers", "فرصت شغلی"), "سند": ("total_documents", "سند"),
                          "فایل": ("total_documents", "فایل")}[noun]
        count = str(summary[key]).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
        return f"تا الان {count} {label} ثبت کرده‌ای."
    fr = re.fullmatch(r"combien (?:de |d')?(candidatures|contacts|offres|documents)(?: (?:j'ai|ai-je|ai je|enregistrees|enregistres|au total|ai-je enregistre|ai-je enregistrees))?", text)
    en = re.fullmatch(r"how many (applications|contacts|offers|documents)(?: (?:do i have|have i saved))?", text)
    match = fr or en
    if match:
        noun = match.group(1)
        key = {"candidatures": "total_applications", "applications": "total_applications",
               "contacts": "total_contacts", "offres": "total_job_offers", "offers": "total_job_offers",
               "documents": "total_documents"}[noun]
        return f"Tu as {summary[key]} {noun} au total." if fr else f"You have {summary[key]} {noun} in total."
    return None
