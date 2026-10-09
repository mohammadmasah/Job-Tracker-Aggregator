"""Report additions since the last successfully completed assistant response."""
import json
from app.services.response_language import request_language

from langchain_core.messages import AIMessageChunk
from langchain_core.runnables import RunnableGenerator

SNAPSHOT_KEY = "workspace_snapshot"
CATEGORIES = ("applications", "contacts", "job_offers", "documents", "contact_methods")


def records_from_snapshot(snapshot):
    records = {key: snapshot.get(key, []) for key in CATEGORIES[:-1]}
    records["contact_methods"] = [
        {**method, "name": contact["name"]}
        for contact in snapshot.get("contacts", []) for method in contact.get("methods", [])
    ]
    return records


def describe_updates(records, history, question):
    current = {key: [row["id"] for row in rows] for key, rows in records.items()}
    previous = None
    for message in reversed(history):
        saved = message.additional_kwargs.get(SNAPSHOT_KEY)
        if saved:
            try:
                previous = json.loads(saved)
            except (ValueError, TypeError):
                continue
            break
    # The first observed snapshot establishes a baseline, not a list of "new" records.
    if previous is None:
        return "", current
    language = 'en' if request_language(question, history) == 'English' else 'fr'
    labels = {
        "fr": ("candidature(s)", "contact(s)", "offre(s)", "document(s)", "coordonnée(s)"),
        "en": ("application(s)", "contact(s)", "job offer(s)", "document(s)", "contact detail(s)"),
    }[language]
    additions = []
    for key, label in zip(CATEGORIES, labels):
        old_ids = set(previous.get(key, []))
        added = [row for row in records[key] if row["id"] not in old_ids]
        if not added:
            continue
        names = []
        for row in added[:3]:
            name = (" — ".join(filter(None, [row.get("company"), row.get("position")]))
                    if key == "applications" else row.get("name") or row.get("title") or row.get("filename"))
            if name:
                names.append(" ".join(str(name).split())[:80])
        details = f" ({'; '.join(names)}{'…' if len(added) > 3 else ''})" if names else ""
        additions.append(f"{len(added)} {label}{details}")
    if not additions:
        return "", current
    heading = {"fr": "Nouveaux ajouts depuis notre dernier échange", "en": "New since our last exchange"}[language]
    return f"{heading} : {', '.join(additions)}.\n\n", current


def with_workspace_updates(chain, snapshot):
    records = records_from_snapshot(snapshot)

    def prepare(inputs):
        message = inputs["student_input"][-1]
        question = message.additional_kwargs.get("display_text") or message.content
        notice, current = describe_updates(records, inputs.get("chat_history", []), question)
        return notice, json.dumps(current)

    def sync_stream(input_stream, config):
        for inputs in input_stream:
            notice, saved = prepare(inputs)
            if notice:
                yield AIMessageChunk(content=notice)
            for chunk in chain.stream(inputs, config):
                yield AIMessageChunk(content=chunk.content)
            yield AIMessageChunk(content="", additional_kwargs={SNAPSHOT_KEY: saved})

    async def async_stream(input_stream, config):
        async for inputs in input_stream:
            notice, saved = prepare(inputs)
            if notice:
                yield AIMessageChunk(content=notice)
            async for chunk in chain.astream(inputs, config):
                yield AIMessageChunk(content=chunk.content)
            yield AIMessageChunk(content="", additional_kwargs={SNAPSHOT_KEY: saved})

    return RunnableGenerator(sync_stream, atransform=async_stream)
