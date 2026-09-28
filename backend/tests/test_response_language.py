import unittest
from langchain_core.messages import AIMessageChunk
from app.services.response_language import LanguageBuffer, FALLBACK, allowed_prose, language_guard, request_language


class ResponseLanguageTests(unittest.IsolatedAsyncioTestCase):
    def test_supported_languages_and_protected_names(self):
        for text in ('Prépare ton CV et révise tes expériences avant ton entretien.',
                     'Prepare your CV and review your experience before the interview.'):
            self.assertTrue(allowed_prose(text))
        self.assertTrue(allowed_prose('**محمد**\nEmail : user@example.com', ['محمد']))
        for text in ('سلام دوست من چطور میتوانم کمکت کنم',
                     'Hola', 'Γεια σου',
                     'Para preparar una entrevista debes revisar tus competencias y tu experiencia.',
                     'Du solltest deinen Lebenslauf vor dem Vorstellungsgespräch überprüfen.'):
            self.assertFalse(allowed_prose(text))

    def test_stream_does_not_leak_partial_foreign_sentence(self):
        buffer = LanguageBuffer([])
        self.assertEqual(buffer.feed('سلام'), [])
        result = buffer.feed(' دوست من.\n')
        self.assertEqual(result[0].content.strip(), FALLBACK)
        self.assertEqual(buffer.feed('more'), [])

    def test_stream_releases_sentences_before_completion(self):
        buffer = LanguageBuffer([])
        result = buffer.feed('Tu peux préparer ton CV. Ensuite')
        self.assertEqual(result[0].content, 'Tu peux préparer ton CV. ')
        self.assertEqual(buffer.pending, 'Ensuite')

    async def test_sync_and_async_reject_foreign_text(self):
        guard = language_guard()
        text = AIMessageChunk(content='سلام دوست من چطور میتوانم کمکت کنم')
        self.assertEqual(guard.invoke(text).content.strip(), FALLBACK)
        self.assertEqual((await guard.ainvoke(text)).content.strip(), FALLBACK)

    def test_language_choice(self):
        self.assertEqual(request_language('How should I prepare for a Python interview?'), 'English')
        self.assertEqual(request_language('چطور برای مصاحبه آماده شوم؟'), 'French')
