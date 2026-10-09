import unittest
from langchain_core.messages import AIMessageChunk, HumanMessage
from app.services.response_language import LanguageBuffer, FALLBACK, allowed_prose, language_guard, request_language, constrain_request


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


    def test_short_messages_and_explicit_language_requests(self):
        for text in ('Hi', 'Hello', 'Thanks', 'Can you explain this?'):
            self.assertEqual(request_language(text), 'English')
        for text in ('Bonjour', 'Salut', 'Merci', 'Comment préparer mon entretien ?'):
            self.assertEqual(request_language(text), 'French')
        self.assertEqual(request_language('Bonjour, please reply in English'), 'English')
        self.assertEqual(request_language('Hello, réponds en français'), 'French')

    def test_neutral_followup_preserves_language_but_new_language_wins(self):
        history = [HumanMessage(content='How can I prepare for this interview?'), HumanMessage(content='OK')]
        self.assertEqual(request_language('continue', history), 'English')
        self.assertEqual(request_language('Merci', history), 'French')
        self.assertEqual(request_language('CV.pdf\n\nHow can I improve it?'), 'English')

    def test_prompt_uses_user_text_not_french_workspace_context(self):
        inputs = {'student_input': [HumanMessage(content='Contexte : candidature française. How can I prepare?', additional_kwargs={'display_text': 'How can I prepare?'})]}
        prepared = constrain_request(inputs)
        self.assertEqual(prepared['response_language'], 'English')
        self.assertIn('balanced amount of detail', prepared['student_input'][0].content)
        self.assertNotIn('at most 3 short sentences', prepared['student_input'][0].content)

    def test_language_fallback_matches_english_turn(self):
        result = language_guard(language='English').invoke(AIMessageChunk(content='سلام دوست من چطور میتوانم کمکت کنم'))
        self.assertIn('Please try again', result.content)


    def test_french_headings_and_short_sentences_are_not_false_rejections(self):
        for text in ('Voici tes dernières candidatures :', 'Bien sûr !', '**Postulé**', '**AI**', 'Dernières candidatures', 'Voici les détails :'):
            self.assertTrue(allowed_prose(text), text)
        self.assertEqual(request_language('quelles ont les dernière mes condidatures?'), 'French')

    async def test_recent_applications_list_survives_stream_in_both_modes(self):
        text = 'Voici tes dernières candidatures :\n\n- **Epitech** — AI — **Postulé**\n- **Colombus Consulting** — Ingénieur.e IA — Refusé\n'
        guard = language_guard(['Epitech', 'Colombus Consulting'])
        self.assertEqual(guard.invoke(AIMessageChunk(content=text)).content, text)
        self.assertEqual((await guard.ainvoke(AIMessageChunk(content=text))).content, text)
        buffer = LanguageBuffer(['Epitech', 'Colombus Consulting'])
        result = []
        for char in text:
            result.extend(buffer.feed(char))
        result.extend(buffer.feed('', final=True))
        self.assertEqual(''.join(chunk.content for chunk in result), text)

    def test_guard_notice_is_not_reused_as_model_history(self):
        from langchain_core.messages import AIMessage
        from app.services.response_language import LEGACY_FALLBACK
        old = AIMessage(content=LEGACY_FALLBACK)
        user = HumanMessage(content='quelles ont les dernière mes condidatures?')
        prepared = constrain_request({'student_input': [user], 'chat_history': [user, old]})
        self.assertEqual(prepared['chat_history'], [user])
        self.assertEqual(old.content, LEGACY_FALLBACK)
