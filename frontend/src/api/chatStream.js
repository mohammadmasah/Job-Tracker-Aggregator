export async function saveLocalChat(command, signal) {
    const response = await fetch("http://localhost:8000/chatbot/local/", {
        method: "POST", credentials: "include", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: command.trim().toLowerCase() }),
    });
    if (!response.ok) {
        const error = new Error("Impossible d'enregistrer ton message. Réessaie.");
        error.response = { status: response.status };
        throw error;
    }
    return (await response.json()).response;
}

export async function fetchChatHistory(signal) {
    const response = await fetch("http://localhost:8000/chatbot/history/", {
        credentials: "include", signal,
    });
    if (!response.ok) {
        const error = new Error("Impossible de charger tes messages.");
        error.response = { status: response.status };
        throw error;
    }
    return (await response.json()).messages;
}

export async function readChatStream(response, onDelta) {
    if (!response.ok) {
        const error = new Error("Chat request failed");
        error.response = { status: response.status };
        throw error;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;
    try {
        while (!completed) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.trim()) continue;
                const event = JSON.parse(line);
                if (event.type === "error") throw new Error(event.message);
                if (event.type === "delta") onDelta(event.text);
                if (event.type === "done") { completed = true; break; }
            }
            if (done && !completed) throw new Error("La réponse a été interrompue. Réessaie.");
        }
    } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
}

export async function requestChatStream(path, body, onDelta, signal) {
    const isFile = body instanceof FormData;
    const response = await fetch(`http://localhost:8000${path}`, {
        method: "POST",
        credentials: "include",
        headers: isFile ? undefined : { "Content-Type": "application/json" },
        body: isFile ? body : JSON.stringify(body),
        signal,
    });
    await readChatStream(response, onDelta);
}
