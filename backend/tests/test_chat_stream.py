import asyncio
import json
import unittest
from unittest.mock import patch

from app.services import chat_stream


class ChatStreamTests(unittest.IsolatedAsyncioTestCase):
    async def test_first_chunk_is_sent_before_generation_finishes(self):
        resume = asyncio.Event()

        async def model(*args):
            yield "سلام"
            await resume.wait()
            yield "!"

        with patch.object(chat_stream, "stream_chatbot_response", model):
            response = chat_stream.streaming_chat_response("Hi", "test")
            stream = response.body_iterator
            first = await asyncio.wait_for(anext(stream), 1)
            self.assertEqual(json.loads(first), {"type": "delta", "text": "سلام"})
            resume.set()
            rest = [json.loads(event) async for event in stream]
            self.assertEqual(rest, [{"type": "delta", "text": "!"}, {"type": "done"}])

    async def test_timeout_is_an_error_event_after_partial_text(self):
        async def model(*args):
            yield "Partial"
            raise TimeoutError()

        with patch.object(chat_stream, "stream_chatbot_response", model):
            events = [json.loads(e) async for e in chat_stream.streaming_chat_response("Hi", "test").body_iterator]
            self.assertEqual([e["type"] for e in events], ["delta", "error"])

    async def test_disconnect_closes_generation(self):
        closed = asyncio.Event()

        async def model(*args):
            try:
                yield "First"
                await asyncio.Event().wait()
            finally:
                closed.set()

        with patch.object(chat_stream, "stream_chatbot_response", model):
            stream = chat_stream.streaming_chat_response("Hi", "test").body_iterator
            await anext(stream)
            await stream.aclose()
            self.assertTrue(closed.is_set())
