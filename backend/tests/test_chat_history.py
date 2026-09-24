import tempfile
import asyncio
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableLambda
from sqlmodel import create_engine

from app.models import User
from app.models.chat_message import ChatMessage
from app.routes import chatbot
from app.services import ai_agents, chat_history
from app.api.deps import get_current_user


class PersistentChatTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.url = f"sqlite:///{Path(self.directory.name) / 'history.db'}"
        self.engine = create_engine(self.url, connect_args={"check_same_thread": False})
        User.__table__.create(self.engine)
        ChatMessage.__table__.create(self.engine)
        self.patch = patch.object(chat_history, "engine", self.engine)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        self.engine.dispose()
        self.directory.cleanup()

    def test_history_survives_new_database_connection(self):
        chat_history.DatabaseChatHistory(1, "default").add_messages([
            HumanMessage(content="Je m'appelle Farid"), AIMessage(content="Salut Farid"),
        ])
        self.engine.dispose()
        replacement = create_engine(self.url)
        try:
            with patch.object(chat_history, "engine", replacement):
                messages = chat_history.DatabaseChatHistory(1, "default").messages
                self.assertEqual([m.content for m in messages], ["Je m'appelle Farid", "Salut Farid"])
        finally:
            replacement.dispose()

    def test_history_api_is_scoped_to_authenticated_user(self):
        chat_history.DatabaseChatHistory(1, "default").add_messages([
            HumanMessage(content="private context", additional_kwargs={"display_text": "/resume"}),
            AIMessage(content="Your summary"),
        ])
        chat_history.DatabaseChatHistory(2, "default").add_messages([HumanMessage(content="Other user secret")])
        app = FastAPI()
        app.include_router(chatbot.router)
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
        with TestClient(app) as client:
            result = client.get("/chatbot/history/")
            self.assertEqual(result.status_code, 200)
            self.assertEqual([m["text"] for m in result.json()["messages"]], ["/resume", "Your summary"])

    def test_new_chain_receives_previous_turn_and_stores_next_turn(self):
        seen = []

        def model(prompt):
            seen.append([m.content for m in prompt.to_messages()])
            return AIMessage(content="D'accord")

        with patch.object(ai_agents, "get_llm_model", return_value=RunnableLambda(model)), patch.object(ai_agents, "get_user_applications_context", return_value="Data with {braces}"):
            ai_agents.generate_chatbot_response("Mon prénom est Farid", "1:default")
            ai_agents.generate_chatbot_response("Quel est mon prénom ?", "1:default")
        self.assertIn("Mon prénom est Farid", seen[1])
        self.assertEqual(len(chat_history.DatabaseChatHistory(1, "default").messages), 4)
        self.assertEqual(chat_history.DatabaseChatHistory(2, "default").messages, [])

    def test_streamed_turn_is_saved_before_completion(self):
        async def collect():
            chunks = [text async for text in ai_agents.stream_chatbot_response("CV content", "1:default", "cv.pdf")]
            self.assertEqual("".join(chunks), "Ton CV est clair.")

        with patch.object(ai_agents, "get_llm_model", return_value=RunnableLambda(lambda prompt: AIMessage(content="Ton CV est clair."))), patch.object(ai_agents, "get_user_applications_context", return_value=""):
            asyncio.run(collect())
        history = chat_history.DatabaseChatHistory(1, "default").messages
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0].content, "CV content")
        self.assertEqual(history[0].additional_kwargs["display_text"], "cv.pdf")

    def test_local_commands_are_saved(self):
        app = FastAPI()
        app.include_router(chatbot.router)
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
        with TestClient(app) as client:
            self.assertEqual(client.post("/chatbot/local/", json={"command": "/help"}).status_code, 200)
            history = client.get("/chatbot/history/").json()["messages"]
            self.assertEqual(history[0]["text"], "/help")
            self.assertEqual(len(history), 2)
