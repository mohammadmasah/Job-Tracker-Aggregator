import asyncio
import json
import os
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from sqlmodel import SQLModel, Session, create_engine
from app.api.deps import get_current_user
from app.services import ai_settings, cloud_ai, llm_service, ai_agents
from app.routes import ai_settings as routes
from app.models.ai_setting import AIProvider

EVENTS = {
    'openai': [{'type': 'response.output_text.delta', 'delta': 'Bonjour. '}, {'type': 'response.output_text.delta', 'delta': 'Salut !'}, {'type': 'response.completed'}],
    'claude': [{'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': 'Bonjour. '}}, {'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': 'Salut !'}}, {'type': 'message_stop'}],
    'gemini': [{'candidates': [{'content': {'parts': [{'text': 'hidden', 'thought': True}, {'text': 'Bonjour. '}]}}]}, {'candidates': [{'content': {'parts': [{'text': 'Salut !'}]}, 'finishReason': 'STOP'}]}],
}


class SettingsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = create_engine(f'sqlite:///{self.temp.name}/test.db', connect_args={'check_same_thread': False})
        SQLModel.metadata.create_all(self.engine)
        self.env = patch.dict(os.environ, {'TRACKIT_AI_KEY_DIR': self.temp.name})
        self.env.start()
        self.db = patch.object(ai_settings, 'engine', self.engine)
        self.db.start()
        self.app = FastAPI()
        self.app.include_router(routes.router)
        self.app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
        self.client = TestClient(self.app)
        self.config = {'provider': 'openai', 'model': 'test-model', 'api_key': 'sk-test-secret', 'consent': True}

    def tearDown(self):
        self.client.close()
        self.db.stop()
        self.env.stop()
        self.engine.dispose()
        self.temp.cleanup()

    def connection_receipt(self):
        with patch.object(routes, 'stream_text', return_value=iter(['OK'])) as stream:
            response = self.client.post('/api/ai/test', json=self.config)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(stream.call_args.args[3][0].content, 'Reply only OK.')
            self.assertNotIn('sk-test-secret', response.text)
        return {**self.config, 'receipt': response.json()['receipt']}

    def test_default_is_local_and_auth_required(self):
        self.assertEqual(self.client.get('/api/ai/settings').json()['provider'], 'local')
        self.app.dependency_overrides.clear()
        self.assertEqual(self.client.get('/api/ai/settings').status_code, 401)

    def test_test_does_not_save_or_activate_and_consent_required(self):
        self.connection_receipt()
        self.assertEqual(self.client.get('/api/ai/settings').json()['profiles'], {})
        with patch.object(routes, 'stream_text') as stream:
            response = self.client.post('/api/ai/test', json={**self.config, 'consent': False})
            self.assertEqual(response.status_code, 400)
            stream.assert_not_called()

    def test_activation_requires_test_of_same_user_key_and_model(self):
        self.assertEqual(self.client.post('/api/ai/activate', json=self.config).status_code, 400)
        data = self.connection_receipt()
        self.assertEqual(self.client.post('/api/ai/activate', json={**data, 'model': 'other'}).status_code, 400)
        self.assertEqual(self.client.post('/api/ai/activate', json={**data, 'api_key': 'different'}).status_code, 400)
        self.app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=2)
        self.assertEqual(self.client.post('/api/ai/activate', json=data).status_code, 400)

    def test_encryption_persistence_user_isolation_and_switching(self):
        data = self.connection_receipt()
        response = self.client.post('/api/ai/activate', json=data)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn('sk-test-secret', response.text)
        with Session(self.engine) as session:
            row = session.get(AIProvider, (1, 'openai'))
            self.assertNotIn('sk-test-secret', row.encrypted_key)
        self.engine.dispose()
        self.assertEqual(ai_settings.active_credentials(1), ('openai', 'test-model', 'sk-test-secret'))
        self.assertIsNone(ai_settings.active_credentials(2))
        self.assertEqual(ai_settings.public_settings(2)['profiles'], {})
        self.assertEqual(self.client.post('/api/ai/activate', json={'provider': 'local'}).status_code, 200)
        self.assertIsNone(ai_settings.active_credentials(1))
        self.assertTrue(ai_settings.public_settings(1)['profiles']['openai']['has_key'])
        with patch.object(routes, 'stream_text', return_value=iter(['OK'])):
            saved = self.client.post('/api/ai/test', json={**self.config, 'api_key': None}).json()
        response = self.client.post('/api/ai/activate', json={**self.config, 'api_key': None, 'receipt': saved['receipt']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.delete('/api/ai/providers/openai').json()['provider'], 'local')
        self.assertEqual(ai_settings.public_settings(1)['profiles'], {})
        if os.name != 'nt':
            self.assertEqual((Path(self.temp.name) / 'ai-credentials.key').stat().st_mode & 0o777, 0o600)

    def test_failed_test_never_changes_active_provider(self):
        self.client.post('/api/ai/activate', json=self.connection_receipt())
        with patch.object(routes, 'stream_text', side_effect=ai_settings.AIError('Quota atteint.')):
            response = self.client.post('/api/ai/test', json={**self.config, 'provider': 'gemini'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ai_settings.public_settings(1)['provider'], 'openai')

    def test_expired_receipt_rejected(self):
        data = self.connection_receipt()
        with patch('time.time', return_value=0):
            data['receipt'] = ai_settings.test_receipt(1, 'openai', 'test-model', 'sk-test-secret')
        self.assertEqual(self.client.post('/api/ai/activate', json=data).status_code, 400)

    def test_key_decryption_failure_never_falls_back(self):
        self.client.post('/api/ai/activate', json=self.connection_receipt())
        (Path(self.temp.name) / 'ai-credentials.key').unlink()
        with self.assertRaises(ai_settings.AIError):
            llm_service.get_llm_model(1)

    def test_chat_and_pdf_use_selected_provider_and_preserve_history(self):
        from app.routes import chatbot, chatbot_analyse
        from app.services import chat_history
        from langchain_core.runnables import RunnableLambda
        self.app.include_router(chatbot.router)
        self.app.include_router(chatbot_analyse.router)
        self.client.post('/api/ai/activate', json=self.connection_receipt())
        model = RunnableLambda(lambda prompt: AIMessage(content='Bonjour.'))
        with patch.object(cloud_ai, 'cloud_model', return_value=model) as factory, patch.object(ai_agents, 'get_user_applications_context', return_value='Workspace context'), patch.object(chat_history, 'engine', self.engine):
            response = self.client.post('/chatbot/', json={'message': 'Salut'})
            self.assertEqual(response.status_code, 200, response.text)
            factory.assert_called_with('openai', 'test-model', 'sk-test-secret')
            stream = self.client.post('/chatbot/', json={'message': 'Encore', 'stream': True})
            self.assertIn('"type": "done"', stream.text)
            document = SimpleNamespace(pages=[SimpleNamespace(extract_text=lambda: 'Un CV de test')])
            with patch.object(chatbot_analyse.pdfplumber, 'open') as pdf:
                pdf.return_value.__enter__.return_value = document
                response = self.client.post('/analyse-cv/', data={'message': 'Analyse', 'stream': 'true'}, files={'file': ('cv.pdf', b'test', 'application/pdf')})
            self.assertIn('"type": "done"', response.text)
            self.assertEqual(factory.call_count, 3)
            history = self.client.get('/chatbot/history/').json()['messages']
            self.assertEqual(len(history), 6)
            self.client.post('/api/ai/activate', json={'provider': 'local'})
            self.assertEqual(self.client.get('/chatbot/history/').json()['messages'], history)

    def test_validation_does_not_echo_invalid_api_key(self):
        from fastapi.exceptions import RequestValidationError
        from app.main import validation_error
        self.app.add_exception_handler(RequestValidationError, validation_error)
        response = self.client.post('/api/ai/test', json={**self.config, 'api_key': 'PRIVATE-KEY-' * 500})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn('PRIVATE-KEY-', response.text)

    def test_service_name_is_rejected_before_any_generation(self):
        with patch.object(routes, 'stream_text') as stream:
            response = self.client.post('/api/ai/test', json={**self.config, 'provider': 'gemini', 'model': 'Gemini'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('pas un modèle', response.json()['detail'])
        stream.assert_not_called()

    def test_model_discovery_does_not_activate_or_store_key(self):
        with patch.object(routes, 'gemini_models', return_value=[{'id': 'gemini-test', 'name': 'Test'}]) as models:
            response = self.client.post('/api/ai/models', json={'provider': 'gemini', 'api_key': 'private-key'})
        self.assertEqual(response.status_code, 200)
        models.assert_called_once_with('private-key')
        self.assertNotIn('private-key', response.text)
        self.assertEqual(ai_settings.public_settings(1)['profiles'], {})
        self.assertEqual(ai_settings.public_settings(1)['provider'], 'local')

    def test_invalid_provider_and_path_model_rejected(self):
        for change in ({'provider': 'unknown'}, {'model': '../../key?secret'}):
            self.assertEqual(self.client.post('/api/ai/test', json={**self.config, **change}).status_code, 422)


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_providers_stream_incrementally_through_langchain(self):
        real_sync, real_async = httpx.Client, httpx.AsyncClient
        for provider, events in EVENTS.items():
            with self.subTest(provider=provider):
                requests = []
                def handler(request):
                    requests.append(request)
                    return httpx.Response(200, text=''.join('data: '+json.dumps(event)+'\n\n' for event in events))
                transport = httpx.MockTransport(handler)
                with patch.object(cloud_ai.httpx, 'Client', side_effect=lambda **kw: real_sync(transport=transport, **kw)), patch.object(cloud_ai.httpx, 'AsyncClient', side_effect=lambda **kw: real_async(transport=transport, **kw)):
                    chain = ChatPromptTemplate.from_messages([('system', 'French only'), ('human', '{text}')]) | cloud_ai.cloud_model(provider, 'test-model', 'secret-key')
                    self.assertEqual(chain.invoke({'text': 'hello'}).content, 'Bonjour. Salut !')
                    chunks = [chunk.content async for chunk in chain.astream({'text': 'hello'})]
                    self.assertEqual(chunks, ['Bonjour. ', 'Salut !'])
                for request in requests:
                    self.assertNotIn('secret-key', str(request.url))
                    self.assertNotIn('secret-key', request.content.decode())
                    self.assertEqual(request.url.scheme, 'https')

    async def test_http_errors_are_sanitized(self):
        real = httpx.Client
        for code in [400, 401, 403, 404, 429, 500]:
            transport = httpx.MockTransport(lambda request: httpx.Response(code, text='secret-key private provider diagnostics'))
            with patch.object(cloud_ai.httpx, 'Client', side_effect=lambda **kw: real(transport=transport, **kw)):
                with self.assertRaises(ai_settings.AIError) as raised:
                    list(cloud_ai.stream_text('openai', 'test', 'secret-key', [HumanMessage('Hi')]))
                self.assertNotIn('secret-key', str(raised.exception))

    async def test_partial_stream_failure_is_not_reported_as_complete(self):
        events = cloud_ai.Events('openai')
        self.assertEqual(events.parse(json.dumps(EVENTS['openai'][0])), 'Bonjour. ')
        with self.assertRaises(ai_settings.AIError):
            events.finish()
        with self.assertRaises(ai_settings.AIError):
            events.parse('{"type":"error","message":"private diagnostic"}')

    async def test_gemini_model_catalog_filters_and_paginates(self):
        real = httpx.Client
        seen = []
        def handler(request):
            seen.append(request)
            if request.url.params.get('pageToken') == 'next':
                return httpx.Response(200, json={'models': [{'name': 'models/gemini-second', 'supportedGenerationMethods': ['generateContent']}]})
            return httpx.Response(200, json={'models': [
                {'name': 'models/gemini-first', 'displayName': 'First', 'supportedGenerationMethods': ['generateContent']},
                {'name': 'models/embedding', 'supportedGenerationMethods': ['embedContent']},
            ], 'nextPageToken': 'next'})
        with patch.object(cloud_ai.httpx, 'Client', side_effect=lambda **kw: real(transport=httpx.MockTransport(handler), **kw)):
            models = cloud_ai.gemini_models('catalog-secret')
        self.assertEqual([model['id'] for model in models], ['gemini-first', 'gemini-second'])
        for request in seen:
            self.assertNotIn('catalog-secret', str(request.url))
            self.assertEqual(request.headers['x-goog-api-key'], 'catalog-secret')

    async def test_history_roles_and_system_context_are_preserved(self):
        messages = [SystemMessage('workspace'), HumanMessage('question'), AIMessage('answer'), HumanMessage('followup')]
        for provider in EVENTS:
            url, headers, data = cloud_ai.request_spec(provider, 'test', 'secret', messages)
            self.assertIn('workspace', json.dumps(data))
            self.assertIn('followup', json.dumps(data))
            self.assertNotIn('additional_kwargs', json.dumps(data))
        self.assertEqual(ai_agents._session_user('42:custom'), 42)
        self.assertIsNone(ai_agents._session_user('custom'))
