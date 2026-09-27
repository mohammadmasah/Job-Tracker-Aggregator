import asyncio
import json
import unittest

from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableLambda
from langchain_core.runnables.history import RunnableWithMessageHistory

from app.services.workspace_updates import SNAPSHOT_KEY, describe_updates, records_from_snapshot, with_workspace_updates


class WorkspaceUpdateTests(unittest.TestCase):
    def snapshot(self, ids):
        return {"summary": {}, "contacts": [{"id": id_, "name": f"Contact {id_}", "methods": []} for id_ in ids]}

    def test_initial_baseline_and_unchanged_data_are_silent(self):
        records = records_from_snapshot(self.snapshot([1]))
        notice, current = describe_updates(records, [], "Bonjour")
        self.assertEqual(notice, "")
        history = [AIMessage(content="Salut", additional_kwargs={SNAPSHOT_KEY: json.dumps(current)})]
        self.assertEqual(describe_updates(records, history, "Bonjour")[0], "")

    def test_detects_new_ids_even_when_total_does_not_change(self):
        _, current = describe_updates(records_from_snapshot(self.snapshot([1])), [], "Bonjour")
        history = [AIMessage(content="", additional_kwargs={SNAPSHOT_KEY: json.dumps(current)})]
        notice, _ = describe_updates(records_from_snapshot(self.snapshot([2])), history, "سلام")
        self.assertIn("Contact 2", notice)
        self.assertIn("مخاطب", notice)
        self.assertNotIn("Contact 1", notice)

    def test_deletions_alone_are_silent(self):
        _, current = describe_updates(records_from_snapshot(self.snapshot([1])), [], "Bonjour")
        history = [AIMessage(content="", additional_kwargs={SNAPSHOT_KEY: json.dumps(current)})]
        self.assertEqual(describe_updates(records_from_snapshot(self.snapshot([])), history, "Bonjour")[0], "")

    def test_streamed_notice_is_saved_and_not_repeated_after_reload(self):
        history = InMemoryChatMessageHistory()

        def chain(ids):
            return RunnableWithMessageHistory(
                with_workspace_updates(RunnableLambda(lambda inputs: AIMessage(content="Réponse")), self.snapshot(ids)),
                lambda session_id: history, input_messages_key="student_input", history_messages_key="chat_history",
            )

        inputs = {"student_input": [HumanMessage(content="Bonjour")]}
        config = {"configurable": {"session_id": "test"}}
        self.assertEqual(chain([1]).invoke(inputs, config).content, "Réponse")

        async def collect():
            return [chunk.content async for chunk in chain([1, 2]).astream(inputs, config)]

        chunks = asyncio.run(collect())
        self.assertIn("Contact 2", chunks[0])
        self.assertIn("Contact 2", history.messages[-1].content)
        # A reconstructed history (as after a database reload) still has the checkpoint.
        history = InMemoryChatMessageHistory(messages=list(history.messages))
        self.assertEqual(chain([1, 2]).invoke(inputs, config).content, "Réponse")

    def test_failed_response_does_not_acknowledge_additions(self):
        def fail(inputs):
            raise RuntimeError("model unavailable")

        pipeline = with_workspace_updates(RunnableLambda(fail), self.snapshot([1, 2]))
        previous = AIMessage(content="", additional_kwargs={SNAPSHOT_KEY: json.dumps({"contacts": [1]})})
        chunks = []
        with self.assertRaises(RuntimeError):
            for chunk in pipeline.stream({"student_input": [HumanMessage(content="Bonjour")], "chat_history": [previous]}):
                chunks.append(chunk)
        self.assertIn("Contact 2", chunks[0].content)
        self.assertTrue(all(SNAPSHOT_KEY not in chunk.additional_kwargs for chunk in chunks))
