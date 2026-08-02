import { IoPersonOutline } from "react-icons/io5";

export default function ContactCard({ contact, onChange, onRemove }) {

    const updateInfo = (index, value) => {
        const newInfos = [...contact.infos];
        newInfos[index] = value;
        onChange("infos", newInfos);
    };

    const addInfo = () => {
        onChange("infos", [...contact.infos, ""]);
    };

    const removeInfo = (index) => {
        onChange("infos", contact.infos.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-card border border-border-soft rounded-sm p-3 space-y-2">
            <div className="flex items-center">
                <IoPersonOutline />
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-right w-full text-text-2 hover:text-text">-</button>
            </div>

            <input
                type="text"
                placeholder="Nom"
                value={contact.name}
                onChange={(e) => onChange("name", e.target.value)}
                className="w-full bg-[#06080d] border border-border-soft rounded-[3px] px-2 py-1.5 text-[11px] text-text placeholder-text-3 focus:outline-none focus:border-border font-mono"
            />

            {/* Liste des infos (tel/email/link) */}
            {contact.infos.map((info, index) => (
                <div key={index} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Tél / Email / Link"
                        value={info}
                        onChange={(e) => updateInfo(index, e.target.value)}
                        className="w-full bg-bg border border-border-soft rounded-[3px] px-2 py-1.5 text-[11px] text-text placeholder-text-3 focus:outline-none focus:border-border font-mono"
                    />
                    {index === contact.infos.length - 1 ? (
                        <button type="button" onClick={addInfo} className="text-sm text-text-2 hover:text-text px-1">+</button>
                    ) : (
                        <button type="button" onClick={() => removeInfo(index)} className="text-sm text-text-2 hover:text-text px-1">-</button>
                    )}
                </div>
            ))}
            <textarea
                placeholder="Notes"
                value={contact.notes || ""}
                onChange={(e) => onChange("notes", e.target.value)}
                className="w-full bg-card border border-border-soft rounded-[3px] px-2 py-1.5 text-[11px] text-text placeholder-text-3 focus:outline-none focus:border-border font-mono"
            ></textarea>
        </div>
    );
}