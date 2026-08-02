import { useState } from "react";
import ContactCard from "../contacts/ContactCard";
import { scrapeUrl } from "../../api/scraper";

export default function ApplicationForm({ onSubmit, onCancel, initial }) {
    const isEdit = Boolean(initial);

    const [url, setUrl] = useState(initial?.url || "");
    const [company, setCompany] = useState(initial?.company || "");
    const [location, setLocation] = useState(initial?.location || "");
    const [position, setPosition] = useState(initial?.position || "");
    const [sector, setSector] = useState(initial?.sector || "");
    const [salary, setSalary] = useState(initial?.salary || "");
    const [remote, setRemote] = useState(initial?.remote || false);
    const [type, setType] = useState(initial?.type || "alternance");
    const [status, setStatus] = useState(initial?.status || "to_apply");
    const [date, setDate] = useState(initial?.applied_at ? initial.applied_at.slice(0, 10) : "");
    const [notes, setNotes] = useState(initial?.notes || "");

    const [contacts, setContacts] = useState([]);
    const [files, setFiles] = useState([]);
    const [scraping, setScraping] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const application = {
            company, location, position, sector,
            salary, remote, type, status, notes, url,
            ...(date && { applied_at: date }),
        };

        if (isEdit) {
            onSubmit(application);
            return;
        }

        onSubmit({ application, contacts, files });

        setUrl(""); setCompany(""); setLocation(""); setPosition("");
        setSector(""); setSalary(""); setRemote(false); setType("alternance");
        setStatus("to_apply"); setDate(""); setNotes("");
        setContacts([]); setFiles([]);
    };

    // Contacts
    const addContact = () => setContacts([...contacts, { name: "", infos: [""], notes: "" }]);
    const updateContact = (index, field, value) => {
        const updated = [...contacts];
        updated[index][field] = value;
        setContacts(updated);
    };
    const removeContact = (index) => setContacts(contacts.filter((_, i) => i !== index));

    // Notes (auto-resize)
    const handleNotesChange = (e) => {
        setNotes(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
    };

    // Files
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFiles([...files, file]);
    };

    // Scraper
    const handleScrape = async () => {
        if (!url.trim()) return;
        setScraping(true);
        try {
            const res = await scrapeUrl(url);
            if (res.data.position) setPosition(res.data.position);
            if (res.data.company) setCompany(res.data.company);
            if (res.data.notes) setNotes(res.data.notes);
            if (res.data.location) setLocation(res.data.location);
            if (res.data.salary) setSalary(res.data.salary);
            if (res.data.sector) setSector(res.data.sector);
            if (res.data.remote) setRemote(res.data.remote);
        } catch (error) {
            const msg = error.response?.data?.detail || "Impossible d'importer depuis cette URL. Remplissez manuellement.";
            alert(msg);
        } finally {
            setScraping(false);
        }
    };

    const input = "placeholder:text-text-3/50 w-full text-text/80 bg-card border border-border-soft rounded-[4px] px-3 py-2 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent transition-colors font-mono";

    return (
        <>
            <div className="flex items-center justify-between px-6 py-4 pb-10 border-b border-border-soft">
                <div className="flex items-center gap-3">
                    <div className="text-xl w-10 h-10 flex items-center justify-center border border-border-soft rounded-[4px] text-accent">
                        {isEdit ? "✎" : "+"}
                    </div>
                    <div>
                        <h2 className="text-[14px] font-bold text-text font-mono">
                            {isEdit ? "Modifier la candidature" : "Nouvelle candidature"}
                        </h2>
                        <p className="text-[11px] text-text-2">
                            {isEdit ? "Modifiez les informations de la candidature" : "Remplissez ou importez depuis une URL d'offre"}
                        </p>
                    </div>
                </div>
                <button type="button" onClick={onCancel} className="text-text-2 hover:text-text">✕</button>
            </div>

            <div className="flex border-b border-border-soft">
                <div className="flex-1 max-h-[350px] overflow-auto custom-scroll">
                    <form id="app-form" onSubmit={handleSubmit} className="w-full flex flex-col gap-4 p-6 my-4">
                        <div className="grid grid-flow-col gap-5">
                            <input
                                type="text"
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className={input}
                            />
                            <button
                                type="button"
                                onClick={handleScrape}
                                disabled={scraping}
                                className="px-4 py-2 text-[11px] font-semibold tracking-wider bg-accent text-bg hover:bg-accent-2 border border-accent rounded-[4px] uppercase font-mono disabled:opacity-50 transition-colors"
                            >
                                {scraping ? "..." : "Scraper"}
                            </button>
                        </div>

                        <div className="grid grid-flow-col gap-5">
                            <input type="text" placeholder="Entreprise" value={company} onChange={(e) => setCompany(e.target.value)} className={input} />
                            <input type="text" placeholder="Localisation" value={location} onChange={(e) => setLocation(e.target.value)} className={input} />
                        </div>

                        <input type="text" placeholder="Poste" value={position} onChange={(e) => setPosition(e.target.value)} className={input} />

                        <div className="grid grid-cols-2 gap-5">
                            <input type="text" placeholder="Secteur" value={sector} onChange={(e) => setSector(e.target.value)} className={input} />
                            <input type="text" placeholder="Salaire" value={salary} onChange={(e) => setSalary(e.target.value)} className={input} />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
                                <option value="alternance">Alternance</option>
                                <option value="stage">Stage</option>
                                <option value="cdi">CDI</option>
                                <option value="cdd">CDD</option>
                            </select>

                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
                                <option value="to_apply">À postuler</option>
                                <option value="applied">Postulé</option>
                                <option value="interview">Entretien</option>
                                <option value="technical_test">Test technique</option>
                                <option value="offer">Offre reçue</option>
                                <option value="accepted">Acceptée</option>
                                <option value="rejected">Refusée</option>
                            </select>

                            <label className="flex items-center gap-2 text-[12px] text-text cursor-pointer font-mono">
                                <span className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={remote}
                                        onChange={(e) => setRemote(e.target.checked)}
                                        className="appearance-none w-4 h-4 border border-border rounded-[3px] bg-bg checked:bg-accent checked:border-accent cursor-pointer transition-colors"
                                    />
                                    {remote && (
                                        <span className="absolute text-bg text-[10px] font-bold pointer-events-none">✓</span>
                                    )}
                                </span>
                                Télétravail
                            </label>

                            <label>
                                <input
                                    type="date"
                                    className={input}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </label>
                        </div>

                        <textarea
                            value={notes}
                            placeholder="Notes"
                            onChange={handleNotesChange}
                            className={`${input} resize-none overflow-hidden`}
                            rows={3}
                        />
                    </form>
                </div>

                {/* Contacts + Documents : uniquement en création */}
                {!isEdit && (
                    <>
                        <div className="w-px bg-border self-stretch"></div>
                        <div className="w-2/5 flex flex-col gap-5 p-6 my-4 max-h-96 overflow-y-auto custom-scroll">
                            <div className="flex justify-between border-b border-border">
                                <p className="uppercase text-text-2 text-2xl">Contacts</p>
                                <button className="text-xl text-text-2 hover:text-text" type="button" onClick={addContact}>+</button>
                            </div>
                            <div className="space-y-2">
                                {contacts.length === 0 && (
                                    <p className="text-[11px] text-text-3">Aucun contact.</p>
                                )}
                                {contacts.map((contact, index) => (
                                    <ContactCard
                                        key={index}
                                        contact={contact}
                                        onChange={(field, value) => updateContact(index, field, value)}
                                        onRemove={() => removeContact(index)}
                                    />
                                ))}
                            </div>

                            <div>
                                <span className="block text-text-2 text-xl uppercase mb-3 border-b border-border-soft">Documents</span>
                                <label className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 text-[11px] text-text-2 bg-card border border-dashed border-border rounded-[4px] hover:border-accent hover:text-text transition-colors font-mono">
                                    ↓ Téléverser un document
                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e)} />
                                </label>
                                {files.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {files.map((f, i) => (
                                            <p key={i} className="text-[11px] text-text-3 font-mono">{f.name}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <footer className="flex justify-end px-6 py-4 pt-10">
                <div className="flex gap-5">
                    <button
                        type="button"
                        className="px-5 py-2 text-[11px] font-semibold tracking-wider text-text-3 hover:text-text-2 border border-border-soft hover:border-border uppercase font-mono rounded-[4px]"
                        onClick={onCancel}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="app-form"
                        className="px-5 py-2 text-[11px] font-semibold tracking-wider text-bg bg-accent hover:bg-accent-2 uppercase font-mono rounded-[4px] transition-colors"
                    >
                        {isEdit ? "Enregistrer" : "Créer la candidature"}
                    </button>
                </div>
            </footer>
        </>
    );
}