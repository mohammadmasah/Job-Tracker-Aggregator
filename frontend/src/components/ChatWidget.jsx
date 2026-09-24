import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import Poulpie from "./Poulpie";
import { IoBusinessOutline, IoBriefcaseOutline, IoPersonOutline, IoDocumentTextOutline, IoCopyOutline, IoCheckmarkOutline, IoVolumeHighOutline } from "react-icons/io5";
import { STATUS_META } from "../constants/status";
import { activeApplicationStore } from "../stores/activeApplication";
import ReactMarkdown from 'react-markdown';

// Match the login host so the browser sends its access_token cookie.
const chatbotApi = axios.create({
    baseURL: "http://localhost:8000",
    withCredentials: true,
    timeout: 100000,
});

function chatbotErrorMessage(error, fallback) {
    if (error.code === "ECONNABORTED" || error.response?.status === 504) {
        return "Poulpie met trop de temps à répondre. Réessaie dans un instant.";
    }
    if (error.response?.status === 401) {
        return "Ta session a expiré. Reconnecte-toi pour utiliser Poulpie.";
    }
    return fallback;
}

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

    //useEffect(() => {
     //   if (scrollRef.current) {
       //     scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        //}
   // }, [messages, typing, open]);

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
            const res = await chatbotApi.post("/chatbot/", { message: payload });
            setTyping(false);                 // on masque les "..." avant de taper
            setMessages((prev) => [...prev, { role: "bot", text: res.data.response }]);
            setOpen((isOpen) => { if (!isOpen) setUnread(true); return isOpen; });
        } catch (error) {
            console.error("Erreur connexion Chatbot API:", error);
            setTyping(false);
            await typeOut(chatbotErrorMessage(error, "Désolé, le service de chat est indisponible. Réessaie dans un instant."));
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

    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || typing) return;

        setMessages((prev) => [...prev, { role: "user", text: `${file.name}` }]);
        setTyping(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("message", "Analyse ce document."); 

        try {
            const res = await chatbotApi.post("/analyse-cv/", formData);
            setTyping(false);
            setMessages((prev) => [...prev, { role: "bot", text: res.data.response }]);
            setOpen((isOpen) => { if (!isOpen) setUnread(true); return isOpen; });
        } catch (error) {
            console.error(error);
            setTyping(false);
            await typeOut(chatbotErrorMessage(error, "Erreur lors de l'envoi du fichier."));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    useEffect(() => {
        const hasOpenedBefore = sessionStorage.getItem("poulpie_opened");

        if (!hasOpenedBefore) {
            const timer = setTimeout(() => {
                openChat();
                sessionStorage.setItem("poulpie_opened", "true");
            }, 0);

            return () => clearTimeout(timer);
        }
    }, []);



const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();

    const bestVoice = voices.find(
        (v) => v.lang.startsWith('fr') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Enhanced'))
    ) || voices.find((v) => v.lang.startsWith('fr'));

    if (bestVoice) utterance.voice = bestVoice;

    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
};
const [copiedIndex, setCopiedIndex] = useState(null);

const copyToClipboard = (text, index) => {
    // پاک‌سازی علامت‌های مارک‌داون قبل از کپی (در صورت نیاز)
    const cleanText = text.replace(/\*/g, '');
    navigator.clipboard.writeText(cleanText);

    // تغییر موقت آیکون به وضعیت کپی شد
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
};
        

return (
        <>
            <style>{`
                @keyframes mascotte-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
                .mascotte-talking { animation: mascotte-bounce 0.5s ease-in-out infinite; }
                @keyframes mascotte-blink { 0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(0.1)} }
                .mascotte-eyes { animation: mascotte-blink 5s infinite; transform-origin:center; transform-box:fill-box; }
                @keyframes tentacle-wave { 0%,100%{transform:translateY(0)} 50%{transform:translateY(1.5px)} }
                .poulpie-tentacles { animation: tentacle-wave 2.4s ease-in-out infinite; transform-origin:center; transform-box:fill-box; }
                @keyframes dot-pulse { 0%,60%,100%{opacity:0.3} 30%{opacity:1} }
                .typing-dot { animation: dot-pulse 1.2s infinite; }
                .typing-dot:nth-child(2){animation-delay:0.2s}
                .typing-dot:nth-child(3){animation-delay:0.4s}
                @keyframes panel-in { from{opacity:0;transform:translateY(12px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes panel-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(12px) scale(0.96)} }
                @keyframes halo-pulse {
                    0%   { box-shadow: 0 0 0 0 var(--halo-color, var(--accent)); opacity: 0.8; }
                    70%  { box-shadow: 0 0 0 12px transparent; opacity: 0; }
                    100% { box-shadow: 0 0 0 0 transparent; opacity: 0; }
                }
                .halo-ring::before {
                    content: ""; position: absolute; inset: -3px; border-radius: 9999px;
                    animation: halo-pulse 2s ease-out infinite;
                    pointer-events: none;
                }
                .panel-in { animation: panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                .panel-out { animation: panel-out 0.15s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
            `}</style>

            {!open && (
                <button
                    onClick={openChat}
                    aria-label="Ouvrir le chat d'assistance Poulpie"
                    className={`fixed bottom-6 right-6 z-50 w-16 h-16 flex items-center justify-center bg-panel rounded-full transition-all duration-300 shadow-xl border-2 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent ${hasFocus ? "halo-ring" : ""}`}
                    style={{ borderColor: hasFocus ? focusColor : "var(--border)", "--halo-color": focusColor }}
                    title={activeApp ? `En contexte : ${isContact ? activeApp.name : isOffer ? activeApp.title : activeApp.company}` : "Ouvrir le chat"}
                >
                    <Poulpie size={38} thinking={hasFocus} />

                    {activeApp && (
                        <span
                            className="focus-bubble absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-sm font-bold transition-transform transform scale-100"
                            style={{ backgroundColor: "var(--panel)", borderColor: focusColor, color: focusColor }}
                            title={isContact ? "Focus : contact" : isOffer ? "Focus : offre" : "Focus : candidature"}
                            aria-hidden="true"
                        >
                            {isContact ? <IoPersonOutline className="text-[13px]" /> : isOffer ? <IoDocumentTextOutline className="text-[13px]" /> : <IoBriefcaseOutline className="text-[13px]" />}
                        </span>
                    )}

                    {unread && (
                        <span 
                            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#f43f5e] border-2 border-bg animate-pulse" 
                            title="Nouvelle réponse disponible" 
                            aria-label="Nouveau message non lu"
                        />
                    )}
                </button>
            )}

            {open && (
                <div 
                    role="dialog"
                    aria-label="Assistant virtuel Poulpie"
                    aria-modal="false"
                    className={`${closing ? "panel-out" : "panel-in"} fixed bottom-6 right-6 z-50 w-[460px] max-w-[calc(100vw-2rem)] h-[720px] max-h-[calc(100vh-3.5rem)] flex flex-col bg-panel border border-border/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md text-text transition-all font-['Google_Sans_Text',sans-serif]`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft bg-bg-2/80 backdrop-blur-sm select-none">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 flex items-center justify-center border border-border-soft rounded-xl bg-card shadow-sm">
                                <Poulpie size={32} talking={typing} thinking={Boolean(activeApp) && !typing} />
                            </div>
                            <div className="leading-tight">
                                <h2 className="text-[15px] font-bold text-text tracking-tight">Poulpie</h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`w-2.5 h-2.5 rounded-full ${typing ? "bg-accent animate-ping" : "bg-emerald-500"}`} />
                                    <p className="text-[11px] text-text-2 font-medium">{typing ? "écrit…" : "en ligne"}</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={closeChat} 
                            aria-label="Fermer le chat" 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-2 hover:text-text hover:bg-card active:scale-95 transition-all text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Context Bar */}
                    {activeApp && (
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-card/60 border-b border-border-soft backdrop-blur-xs">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: focusColor }} />
                            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                {isContact ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[13px] text-text font-semibold truncate">
                                            <IoPersonOutline className="text-[14px] text-text-3 shrink-0" />
                                            {activeApp.name}
                                        </span>
                                        <span className="text-[11px] text-text-3 font-medium truncate pl-[20px]">Contact sélectionné</span>
                                    </>
                                ) : isOffer ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[13px] text-text font-semibold truncate">
                                            <IoDocumentTextOutline className="text-[14px] text-text-3 shrink-0" />
                                            {activeApp.title}
                                        </span>
                                        {activeApp.company && (
                                            <span className="flex items-center gap-1.5 text-[12px] text-text-2 truncate pl-[20px]">
                                                <IoBusinessOutline className="text-[13px] text-text-3 shrink-0" />
                                                {activeApp.company}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[13px] text-text font-semibold truncate">
                                            <IoBusinessOutline className="text-[14px] text-text-3 shrink-0" />
                                            {activeApp.company}
                                        </span>
                                        {activeApp.position && (
                                            <span className="flex items-center gap-1.5 text-[12px] text-text-2 truncate pl-[20px]">
                                                <IoBriefcaseOutline className="text-[13px] text-text-3 shrink-0" />
                                                {activeApp.position}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Messages Container */}
                    <div 
                        ref={scrollRef} 
                        role="log"
                        aria-live="polite"
                        aria-label="Historique des messages"
                        className="flex-1 overflow-y-auto custom-scroll px-5 py-4 space-y-4"
                    >
                        {messages.map((m, i) =>
                            m.role === "bot" ? (
                                <div key={i} className="flex items-end gap-3 group">
                                    <div className="shrink-0 w-8 h-8 flex items-center justify-center mb-0.5" aria-hidden="true">
                                        <Poulpie size={26} />
                                    </div>
                                    
                                    <div className="max-w-[84%] bg-card border border-border-soft rounded-2xl rounded-bl-sm px-4 py-3 text-[13px] text-text leading-relaxed shadow-xs">
                                        {/* رندر مارک‌داون پیام */}
                                        <ReactMarkdown>{m.text}</ReactMarkdown>

                                        {/* نوار ابزار پایین پیام (صدا + کپی) */}
                                        {m.text && (
                                            <div className="mt-2 pt-2 border-t border-border-soft/40 flex items-center gap-2 select-none">
                                                <button
                                                    onClick={() => speakText(m.text)}
                                                    title="Écouter le message"
                                                    aria-label="Écouter le message"
                                                    className="p-1.5 rounded-lg text-text-3 hover:text-text hover:bg-card/80 transition-all flex items-center justify-center text-base active:scale-90"
                                                >
                                                    <IoVolumeHighOutline className="text-[17px]" />
                                                </button>

                                                <button
                                                    onClick={() => copyToClipboard(m.text, i)}
                                                    title={copiedIndex === i ? "Copié !" : "Copier le texte"}
                                                    aria-label="Copier le texte"
                                                    className="p-1.5 rounded-lg text-text-3 hover:text-text hover:bg-card/80 transition-all flex items-center justify-center text-base active:scale-90"
                                                >
                                                    {copiedIndex === i ? (
                                                        <IoCheckmarkOutline className="text-[17px] text-emerald-500" />
                                                    ) : (
                                                        <IoCopyOutline className="text-[17px]" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div key={i} className="flex justify-end">
                                    <div className="max-w-[84%] bg-accent text-bg font-medium rounded-2xl rounded-br-sm px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap shadow-xs">
                                        {m.text}
                                    </div>
                                </div>
                            )
                        )}

                        {/* نشانگر تایپ ربات (خارج از حلقه پیام‌ها) */}
                        {typing && (
                            <div className="flex items-end gap-3" role="status" aria-label="Poulpie est en train d'écrire">
                                <div className="shrink-0 w-8 h-8 flex items-center justify-center mb-0.5" aria-hidden="true">
                                    <Poulpie size={26} talking />
                                </div>
                                <div className="bg-card border border-border-soft rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-xs">
                                    <span className="typing-dot w-2 h-2 rounded-full bg-text-2" />
                                    <span className="typing-dot w-2 h-2 rounded-full bg-text-2" />
                                    <span className="typing-dot w-2 h-2 rounded-full bg-text-2" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Commands */}
                    {commands && commands.length > 0 && (
                        <div 
                            aria-label="Commandes rapides"
                            className="flex gap-2.5 px-5 py-2.5 border-t border-border-soft/60 overflow-x-auto custom-scroll bg-bg-2/30"
                        >
                            {commands.map((cmd) => (
                                <button
                                    key={cmd}
                                    onClick={() => sendMessage(cmd)}
                                    className="shrink-0 text-[11px] font-medium text-text-2 hover:text-text bg-card hover:bg-card/80 border border-border-soft hover:border-accent/50 rounded-xl px-3.5 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
                                >
                                    {cmd}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Controls */}
                    <div className="flex items-end gap-2.5 px-5 py-3.5 border-t border-border-soft bg-bg-2/50">
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                    e.target.style.height = "auto";
                                }
                            }}
                            placeholder={activeApp ? `Une question sur ${isContact ? activeApp.name : isOffer ? activeApp.title : activeApp.company} ?` : "Pose une question ou tape /help"}
                            className="flex-1 bg-bg border border-border-soft rounded-xl px-4 py-2.5 text-[13px] text-text placeholder-text-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none max-h-[120px] custom-scroll leading-relaxed"
                            aria-label="Votre message"
                        />
                        
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            type="button" 
                            aria-label="Joindre un fichier PDF"
                            title="Joindre un fichier PDF"
                            className="shrink-0 w-10 h-10 flex items-center justify-center bg-card border border-border-soft rounded-xl text-text-2 hover:text-accent hover:border-accent/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95 text-lg mb-0.5"
                        >
                            📎
                        </button>
                        
                        <button 
                            onClick={() => sendMessage()} 
                            aria-label="Envoyer le message" 
                            title="Envoyer"
                            className="shrink-0 w-10 h-10 flex items-center justify-center bg-accent text-bg rounded-xl hover:opacity-95 active:scale-95 transition-all font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent text-base mb-0.5"
                        >
                            ↑
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
