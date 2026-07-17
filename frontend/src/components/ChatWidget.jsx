import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import Poulpie from "./Poulpie";
import { IoBusinessOutline, IoBriefcaseOutline, IoPersonOutline, IoDocumentTextOutline } from "react-icons/io5";
import { STATUS_META } from "../constants/status";
import { activeApplicationStore } from "../stores/activeApplication";

const CHAT_URL = "http://127.0.0.1:8000/chatbot/";

const WELCOME = {
    role: "bot",
    text: "Salut ! Je suis Poulpie, ton assistant de candidatures. Ouvre une candidature et je pourrai répondre à des questions dessus. Tape /help pour voir ce que je sais faire.",
};

// Contexte injecté au LLM quand une candidature est ouverte
function buildContext(app, kind = "application") {
    if (!app) return "";
    if (kind === "contact") {
        const methods = (app.methods || []).map((m) => `${m.type}: ${m.value}`).join(", ");
        return (
            "Contexte — l'utilisateur consulte ce contact :\n" +
            `Nom: ${app.name || "—"}\n` +
            `Coordonnées: ${methods || "—"}\n` +
            `Notes: ${app.notes || "—"}\n\n`
        );
    }
    if (kind === "offer") {
        const arr = (v) => Array.isArray(v) ? v.join(", ") : (v || "—");
        const salaire = app.salary_min || app.salary_max
            ? `${app.salary_min || ""}${app.salary_max ? " - " + app.salary_max : ""} ${app.salary_currency || "€"}`
            : "—";
        return (
            "Contexte — l'utilisateur consulte cette offre d'emploi :\n" +
            `Titre: ${app.title || "—"}\n` +
            `Entreprise: ${app.company || "—"}\n` +
            `Localisation: ${arr(app.localisation)}\n` +
            `Compétences: ${arr(app.skills)}\n` +
            `Secteurs: ${arr(app.sectors)}\n` +
            `Salaire: ${salaire}\n` +
            `Source: ${app.source || "—"}\n\n`
        );
    }
    const statut = STATUS_META[app.status]?.label || app.status;
    return (
        "Contexte — l'utilisateur consulte cette candidature :\n" +
        `Entreprise: ${app.company || "—"}\n` +
        `Poste: ${app.position || "—"}\n` +
        `Statut: ${statut}\n` +
        `Type: ${app.type || "—"}\n` +
        `Localisation: ${app.remote ? "Télétravail" : app.location || "—"}\n` +
        `Salaire: ${app.salary || "—"}\n` +
        `Secteur: ${app.sector || "—"}\n` +
        `URL de l'offre: ${app.url || "—"}\n` +
        `Notes: ${app.notes || "—"}\n\n`
    );
}

// Commandes traitées localement (instantanées, pas d'appel LLM)
// Retourne une string si la commande est gérée, sinon null (→ envoi au LLM)
function localCommand(text, app) {
    const t = text.trim().toLowerCase();

    if (t === "/help") {
        return "Commandes : /resume (résumé de la candidature ouverte), /relance (mail de relance), /questions (questions d'entretien). Tu peux aussi me poser n'importe quelle question librement !";
    }

    if (["/resume", "/relance", "/questions"].includes(t) && !app) {
        return "Ouvre d'abord une candidature (clique une carte) pour que je puisse t'aider dessus.";
    }

    return null; // pas une commande locale → LLM
}

// Transforme une commande en vraie consigne pour le LLM
function commandToPrompt(text, app) {
    const t = text.trim().toLowerCase();
    if (t === "/resume" && app) return "Fais-moi un résumé clair et concret de cette candidature.";
    if (t === "/relance" && app) return "Rédige un mail de relance professionnel et bref pour cette candidature.";
    if (t === "/questions" && app) return "Donne-moi 5 questions d'entretien probables pour ce poste, avec un court conseil pour chacune.";
    return text; // message normal
}

export default function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [messages, setMessages] = useState([WELCOME]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const [unread, setUnread] = useState(false);
    const scrollRef = useRef(null);
    const typingTimer = useRef(null);

    // Nettoie le timer si le composant est démonté
    useEffect(() => () => clearInterval(typingTimer.current), []);

    // Affiche `fullText` caractère par caractère dans le dernier message bot
    const typeOut = (fullText) => {
        return new Promise((resolve) => {
            // On ajoute d'abord un message bot vide, qu'on va remplir
            setMessages((prev) => [...prev, { role: "bot", text: "" }]);
            // Si le chat est fermé, on signale une réponse non lue (pastille)
            setOpen((isOpen) => { if (!isOpen) setUnread(true); return isOpen; });
            let i = 0;
            clearInterval(typingTimer.current);
            typingTimer.current = setInterval(() => {
                i++;
                const slice = fullText.slice(0, i);
                setMessages((prev) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: "bot", text: slice };
                    return copy;
                });
                if (i >= fullText.length) {
                    clearInterval(typingTimer.current);
                    resolve();
                }
            }, 12); // vitesse de frappe (ms par caractère)
        });
    };

    const activeApp = useSyncExternalStore(
        activeApplicationStore.subscribe,
        activeApplicationStore.get
    );
    const focusKind = useSyncExternalStore(
        activeApplicationStore.subscribe,
        activeApplicationStore.getKind
    );
    const focusColor = useSyncExternalStore(
        activeApplicationStore.subscribe,
        activeApplicationStore.getColor
    );
    const isContact = focusKind === "contact";
    const isOffer = focusKind === "offer";
    const isWaiting = focusKind === "waiting";
    const hasFocus = Boolean(activeApp) || isWaiting;   // waiting = focus léger sans données

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typing, open]);

    const sendMessage = async (textToSend = null) => {
        const raw = typeof textToSend === "string" ? textToSend : input;
        const text = raw.trim();
        if (!text || typing) return;

        // Affiche le message utilisateur
        setMessages((prev) => [...prev, { role: "user", text }]);
        setInput("");

        // 1) Commande locale instantanée (/help, ou commande sans candidature) ?
        const local = localCommand(text, activeApp);
        if (local !== null) {
            await typeOut(local);
            return;
        }

        // 2) Sinon → LLM. On transforme la commande en consigne, on injecte le contexte.
        setTyping(true);
        const instruction = commandToPrompt(text, activeApp);
        const payload = buildContext(activeApp, focusKind) + instruction;

        try {
            const res = await axios.post(CHAT_URL, { message: payload });
            setTyping(false);                 // on masque les "..." avant de taper
            await typeOut(res.data.response);
        } catch (error) {
            console.error("Erreur connexion Chatbot API:", error);
            setTyping(false);
            await typeOut("Désolé, je n'arrive pas à joindre le serveur. Vérifie qu'il tourne et réessaie.");
        }
    };

    const openChat = () => { setOpen(true); setClosing(false); setUnread(false); };
    const closeChat = () => {
        setClosing(true);
        setTimeout(() => { setOpen(false); setClosing(false); }, 160);
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const commands = activeApp
        ? ["/resume", "/relance", "/questions", "/help"]
        : ["/help"];

    return (
        <>
            <style>{`
                @keyframes mascotte-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
                .mascotte-talking { animation: mascotte-bounce 0.5s ease-in-out infinite; }
                @keyframes mascotte-blink { 0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(0.1)} }
                .mascotte-eyes { animation: mascotte-blink 5s infinite; transform-origin:center; transform-box:fill-box; }
                @keyframes tentacle-wave { 0%,100%{transform:translateY(0)} 50%{transform:translateY(1.5px)} }
                .poulpie-tentacles { animation: tentacle-wave 2.4s ease-in-out infinite; transform-origin:center; transform-box:fill-box; }
                @keyframes dot-pulse { 0%,60%,100%{opacity:0.25} 30%{opacity:1} }
                .typing-dot { animation: dot-pulse 1.2s infinite; }
                .typing-dot:nth-child(2){animation-delay:0.2s}
                .typing-dot:nth-child(3){animation-delay:0.4s}
                @keyframes panel-in { from{opacity:0;transform:translateY(8px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes panel-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(8px) scale(0.98)} }
                @keyframes halo-pulse {
                    0%   { box-shadow: 0 0 0 0 var(--accent); opacity: 0.6; }
                    70%  { box-shadow: 0 0 0 10px transparent; opacity: 0; }
                    100% { box-shadow: 0 0 0 0 transparent; opacity: 0; }
                }
                .halo-ring::before {
                    content: ""; position: absolute; inset: -2px; border-radius: 9999px;
                    animation: halo-pulse 2s ease-out infinite;
                }
                .panel-in { animation: panel-in 0.16s ease-out; }
                .panel-out { animation: panel-out 0.16s ease-in forwards; }
            `}</style>

            {!open && (
                <button
                    onClick={openChat}
                    aria-label="Ouvrir le chat"
                    className={`fixed bottom-6 right-6 z-50 w-16 h-16 flex items-center justify-center bg-panel rounded-full transition-colors shadow-lg border-2 ${hasFocus ? "halo-ring" : ""}`}
                    style={{ borderColor: hasFocus ? focusColor : "var(--border)", "--halo-color": focusColor }}
                    title={activeApp ? `En contexte : ${isContact ? activeApp.name : isOffer ? activeApp.title : activeApp.company}` : "Ouvrir le chat"}
                >
                    <Poulpie size={36} thinking={hasFocus} />

                    {/* Bulle de focus : montre CE sur quoi Poulpie réfléchit */}
                    {activeApp && (
                        <span
                            className="focus-bubble absolute -top-2 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2"
                            style={{ backgroundColor: "var(--panel)", borderColor: focusColor, color: focusColor }}
                            title={isContact ? "Focus : contact" : isOffer ? "Focus : offre" : "Focus : candidature"}
                        >
                            {isContact ? <IoPersonOutline className="text-[12px]" /> : isOffer ? <IoDocumentTextOutline className="text-[12px]" /> : <IoBriefcaseOutline className="text-[12px]" />}
                        </span>
                    )}

                    {/* Pastille : Poulpie a répondu pendant que le chat était fermé */}
                    {unread && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#f43f5e] border-2 border-bg animate-pulse" title="Nouvelle réponse" />
                    )}
                </button>
            )}

            {open && (
                <div className={`${closing ? "panel-out" : "panel-in"} fixed bottom-6 right-6 z-50 w-[360px] h-[520px] flex flex-col bg-panel border border-border rounded-[6px] overflow-hidden shadow-2xl font-mono`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft bg-bg-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 flex items-center justify-center border border-border-soft rounded-[4px] bg-card">
                                <Poulpie size={28} talking={typing} thinking={Boolean(activeApp) && !typing} />
                            </div>
                            <div className="leading-tight">
                                <p className="text-[13px] font-bold text-text">Poulpie</p>
                                <p className="text-[10px] text-text-2">{typing ? "écrit…" : "en ligne"}</p>
                            </div>
                        </div>
                        <button onClick={closeChat} aria-label="Fermer le chat" className="text-text-2 hover:text-text text-lg leading-none px-1">✕</button>
                    </div>

                    {activeApp && (
                        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-card border-b border-border-soft">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: focusColor }} />
                            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                {isContact ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[11px] text-text font-semibold truncate">
                                            <IoPersonOutline className="text-[12px] text-text-3 shrink-0" />
                                            {activeApp.name}
                                        </span>
                                        <span className="text-[10px] text-text-3 truncate pl-[18px]">Contact</span>
                                    </>
                                ) : isOffer ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[11px] text-text font-semibold truncate">
                                            <IoDocumentTextOutline className="text-[12px] text-text-3 shrink-0" />
                                            {activeApp.title}
                                        </span>
                                        {activeApp.company && (
                                            <span className="flex items-center gap-1.5 text-[10px] text-text-2 truncate">
                                                <IoBusinessOutline className="text-[11px] text-text-3 shrink-0" />
                                                {activeApp.company}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[11px] text-text font-semibold truncate">
                                            <IoBusinessOutline className="text-[12px] text-text-3 shrink-0" />
                                            {activeApp.company}
                                        </span>
                                        {activeApp.position && (
                                            <span className="flex items-center gap-1.5 text-[10px] text-text-2 truncate">
                                                <IoBriefcaseOutline className="text-[11px] text-text-3 shrink-0" />
                                                {activeApp.position}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-3">
                        {messages.map((m, i) =>
                            m.role === "bot" ? (
                                <div key={i} className="flex items-end gap-2">
                                    <div className="shrink-0 w-7 h-7 flex items-center justify-center mb-0.5">
                                        <Poulpie size={24} />
                                    </div>
                                    <div className="max-w-[78%] bg-card border border-border-soft rounded-[4px] rounded-bl-none px-3 py-2 text-[12px] text-text leading-relaxed whitespace-pre-wrap">
                                        {m.text}
                                    </div>
                                </div>
                            ) : (
                                <div key={i} className="flex justify-end">
                                    <div className="max-w-[78%] bg-accent text-bg rounded-[4px] rounded-br-none px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap">
                                        {m.text}
                                    </div>
                                </div>
                            )
                        )}

                        {typing && (
                            <div className="flex items-end gap-2">
                                <div className="shrink-0 w-7 h-7 flex items-center justify-center mb-0.5">
                                    <Poulpie size={24} talking />
                                </div>
                                <div className="bg-card border border-border-soft rounded-[4px] rounded-bl-none px-3 py-2.5 flex gap-1">
                                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-2" />
                                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-2" />
                                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-2" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-1.5 px-3 py-2 border-t border-border-soft overflow-x-auto custom-scroll">
                        {commands.map((cmd) => (
                            <button
                                key={cmd}
                                onClick={() => sendMessage(cmd)}
                                className="shrink-0 text-[10px] text-text-2 hover:text-text bg-card border border-border-soft hover:border-accent rounded-[3px] px-2 py-1 transition-colors"
                            >
                                {cmd}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 px-3 py-3 border-t border-border-soft">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={activeApp ? `Une question sur ${isContact ? activeApp.name : isOffer ? activeApp.title : activeApp.company} ?` : "Pose une question ou tape /help"}
                            className="flex-1 bg-bg border border-border-soft rounded-[4px] px-3 py-2 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent transition-colors font-mono"
                        />
                        <button onClick={() => sendMessage()} aria-label="Envoyer" className="shrink-0 w-9 h-9 flex items-center justify-center bg-accent text-bg rounded-[4px] hover:bg-accent-2 transition-colors">↑</button>
                    </div>
                </div>
            )}
        </>
    );
}