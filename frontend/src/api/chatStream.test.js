import test from "node:test";
import assert from "node:assert/strict";
import { readChatStream } from "./chatStream.js";

test("renders the first delta before completion and decodes split Persian UTF-8", async () => {
    let source;
    const response = new Response(new ReadableStream({ start(controller) { source = controller; } }));
    const encoder = new TextEncoder();
    const chunks = [];
    let first;
    const arrived = new Promise((resolve) => { first = resolve; });
    const reading = readChatStream(response, (text) => { chunks.push(text); first(); });
    const bytes = encoder.encode(JSON.stringify({ type: "delta", text: "سلام" }) + "\n");
    for (const byte of bytes) source.enqueue(Uint8Array.of(byte));
    await arrived;
    assert.deepEqual(chunks, ["سلام"]);
    source.enqueue(encoder.encode('{"type":"delta","text":"!"}\n{"type":"done"}\n'));
    source.close();
    await reading;
    assert.equal(chunks.join(""), "سلام!");
});

test("reports a truncated stream after preserving received text", async () => {
    const chunks = [];
    await assert.rejects(readChatStream(new Response('{"type":"delta","text":"Hello"}\n'), (t) => chunks.push(t)), /interrompue/);
    assert.deepEqual(chunks, ["Hello"]);
});

test("reports server stream errors and authentication failures", async () => {
    await assert.rejects(readChatStream(new Response('{"type":"error","message":"Timed out"}\n'), () => {}), /Timed out/);
    await assert.rejects(readChatStream(new Response("", { status: 401 }), () => {}), (error) => error.response.status === 401);
});
