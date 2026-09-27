import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.routes import chatbot_analyse


class PdfMessageTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(chatbot_analyse.router)
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=7)
        self.client = TestClient(app)
        self.pdf = MagicMock()
        self.pdf.__enter__.return_value.pages = [SimpleNamespace(extract_text=lambda: "PDF content")]

    def send(self, message, stream=False):
        return self.client.post("/analyse-cv/", data={"message": message, "stream": str(stream).lower()},
                                files={"file": ("cv.pdf", b"test PDF", "application/pdf")})

    def test_caption_and_pdf_are_sent_together_and_retained_for_history(self):
        with patch.object(chatbot_analyse.pdfplumber, "open", return_value=self.pdf), patch.object(chatbot_analyse, "generate_chatbot_response", return_value="Réponse") as model:
            self.assertEqual(self.send("Compare ce CV à un poste React").status_code, 200)
            self.assertIn("Compare ce CV à un poste React", model.call_args.args[0])
            self.assertIn("PDF content", model.call_args.args[0])
            self.assertEqual(model.call_args.kwargs["display_message"], "cv.pdf\n\nCompare ce CV à un poste React")
            self.assertEqual(model.call_args.kwargs["session_id"], "7:default")

    def test_stream_keeps_caption_and_pdf_only_has_default_instruction(self):
        for caption in ("Résume en une phrase", ""):
            with self.subTest(caption=caption), patch.object(chatbot_analyse.pdfplumber, "open", return_value=self.pdf), patch.object(chatbot_analyse, "streaming_chat_response", return_value=StreamingResponse(iter(['{"type":"done"}\n']))) as stream:
                self.assertEqual(self.send(caption, stream=True).status_code, 200)
                self.assertIn(caption or "Analyse brièvement", stream.call_args.args[0])
                self.assertEqual(stream.call_args.args[2], "cv.pdf" + ("\n\n" + caption if caption else ""))

    def test_empty_pdf_is_rejected_without_calling_model(self):
        self.pdf.__enter__.return_value.pages = []
        with patch.object(chatbot_analyse.pdfplumber, "open", return_value=self.pdf), patch.object(chatbot_analyse, "generate_chatbot_response") as model:
            self.assertEqual(self.send("Analyse ceci").status_code, 400)
            model.assert_not_called()
