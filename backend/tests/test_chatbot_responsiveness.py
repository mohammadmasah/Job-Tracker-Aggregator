import asyncio
import time
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from httpx import ReadTimeout

from app.routes import chatbot
from app.services.llm_service import get_llm_model


class ChatbotResponsivenessTests(unittest.IsolatedAsyncioTestCase):
    async def test_generation_does_not_block_other_requests(self):
        def slow_response(*args, **kwargs):
            time.sleep(0.2)
            return "Bonjour"

        with patch.object(chatbot, "generate_chatbot_response", slow_response):
            task = asyncio.create_task(
                chatbot.chat_with_assistant(chatbot.ChatRequest(message="Salut"))
            )
            await asyncio.sleep(0.03)
            self.assertFalse(task.done(), "Generation blocked the event loop")
            self.assertEqual(await task, {"response": "Bonjour"})

    async def test_model_timeout_returns_gateway_timeout(self):
        with patch.object(chatbot, "generate_chatbot_response", side_effect=ReadTimeout("slow")):
            with self.assertRaises(HTTPException) as error:
                await chatbot.chat_with_assistant(chatbot.ChatRequest(message="Salut"))
            self.assertEqual(error.exception.status_code, 504)

    def test_model_has_output_and_transport_limits(self):
        model = get_llm_model()
        self.assertEqual(model.num_predict, 1024)
        self.assertEqual(model.client_kwargs["timeout"], 90.0)


if __name__ == "__main__":
    unittest.main()
