import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from app.api.deps import get_current_user
from app.database import get_session
from app.models import Application, Offer
from app.models.interview import InterviewSession
from app.routes import interviews


class InterviewTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.engine = create_engine(f'sqlite:///{Path(self.directory.name) / "test.db"}', connect_args={'check_same_thread': False})
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([Application(id=1, company='Havas', position='Développeur React', notes='Mission complète React et tests'),
                            Offer(id=1, source='test', company='Havas', title='Designer', description='Design accessible'),
                            Application(id=2, company='100% Studio', position='Développeur Python')])
            session.commit()
        self.app = FastAPI()
        self.app.include_router(interviews.router)
        self.user_id = 1
        self.app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=self.user_id)
        def sessions():
            with Session(self.engine) as session:
                yield session
        self.app.dependency_overrides[get_session] = sessions
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()
        self.directory.cleanup()

    def create(self, **extra):
        response = self.client.post('/api/interviews', json={'source_kind': 'application', 'source_id': 1, **extra})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_source_search_and_pagination(self):
        result = self.client.get('/api/interviews/sources?q=havas&limit=1').json()
        self.assertEqual(result['total'], 2)
        self.assertEqual(result['items'][0]['kind'], 'application')
        result = self.client.get('/api/interviews/sources?q=havas&limit=1&offset=1').json()
        self.assertEqual(result['items'][0]['kind'], 'offer')
        self.assertEqual(self.client.get('/api/interviews/sources?q=%25').json()['total'], 1)
        self.assertEqual(self.client.get('/api/interviews/sources?q=absent').json()['total'], 0)

    def test_private_history_snapshot_and_restart(self):
        record = self.create(profile='Mon parcours')
        self.assertEqual(record['context']['notes'], 'Mission complète React et tests')
        with Session(self.engine) as session:
            app = session.get(Application, 1)
            session.delete(app)
            session.commit()
        self.engine.dispose()
        response = self.client.get(f'/api/interviews/{record["id"]}')
        self.assertEqual(response.json()['profile'], 'Mon parcours')
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.user_id = 2
        self.assertEqual(self.client.get('/api/interviews').json(), [])
        self.assertEqual(self.client.get(f'/api/interviews/{record["id"]}').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/interviews/{record["id"]}').status_code, 404)
        self.user_id = 1
        self.assertEqual(len(self.client.get('/api/interviews').json()), 1)
        self.assertEqual(self.client.delete(f'/api/interviews/{record["id"]}').status_code, 204)

    def test_offer_context_and_validation(self):
        record = self.create(source_kind='offer', language='en')
        self.assertEqual(record['context']['description'], 'Design accessible')
        self.assertEqual(record['position'], 'Designer')
        self.assertEqual(self.client.post('/api/interviews', json={'source_kind': 'application', 'source_id': 999}).status_code, 404)
        self.assertEqual(self.client.post('/api/interviews', json={'source_kind': 'bad', 'source_id': 1}).status_code, 422)

    def test_authentication_required(self):
        self.app.dependency_overrides.pop(get_current_user)
        for method, path in [('get', '/api/interviews/sources'), ('get', '/api/interviews'), ('get', '/api/interviews/1'), ('delete', '/api/interviews/1')]:
            self.assertEqual(getattr(self.client, method)(path).status_code, 401)

    def action(self, record, action, answer='', **extra):
        import uuid
        return self.client.post(f'/api/interviews/{record["id"]}/practice', json={
            'action': action, 'answer': answer, 'revision': record['revision'], 'request_id': str(uuid.uuid4()), **extra})

    def test_practice_lifecycle_retry_and_early_report(self):
        from unittest.mock import AsyncMock, patch
        opening = {'preparation': {'role_summary': 'React', 'priorities': ['Tests'], 'tips': ['Un exemple']}, 'question': 'Présente un projet.'}
        followup = {'feedback': {'strengths': ['Exemple concret'], 'improvements': ['Précise ton rôle'], 'example': 'Dans mon projet…'}, 'next_question': 'Comment testes-tu ?'}
        report = {'summary': 'Un premier entraînement', 'strengths': [], 'improvements': [{'point': 'Préciser', 'evidence': 'Réponse courte', 'question': 1}], 'next_steps': ['Préparer un exemple'], 'employer_questions': ['Quelle équipe ?']}
        record = self.create()
        with patch('app.services.interview_coach.coach', new_callable=AsyncMock) as coach:
            self.assertEqual(self.action(record, 'finish').status_code, 409)
            coach.return_value = opening
            started = self.action(record, 'start', request_id='test-request-00000001')
            self.assertEqual(started.status_code, 200, started.text)
            self.assertEqual(self.action(record, 'start', request_id='test-request-00000001').json(), started.json())
            self.assertEqual(coach.await_count, 1)
            self.assertEqual(self.action(record, 'start').status_code, 409)
            record = started.json()
            coach.return_value = followup
            response = self.action(record, 'answer', 'Un site React')
            self.assertEqual(response.status_code, 200, response.text)
            record = response.json()
            self.assertEqual(record['answered'], 1)
            self.assertEqual(record['turns'][0]['answer'], 'Un site React')
            coach.return_value = report
            record = self.action(record, 'finish').json()
            self.assertEqual(record['status'], 'completed')
            self.assertEqual(record['report'], report)
            self.assertEqual(self.action(record, 'answer', 'Autre').status_code, 409)

    def test_ai_error_leaves_session_unchanged_and_private(self):
        from unittest.mock import AsyncMock, patch
        record = self.create()
        with patch('app.services.interview_coach.coach', new_callable=AsyncMock, side_effect=RuntimeError('SECRET_API_KEY')):
            response = self.action(record, 'start')
            self.assertEqual(response.status_code, 502)
            self.assertNotIn('SECRET', response.text)
            self.assertEqual(self.client.get(f'/api/interviews/{record["id"]}').json()['revision'], 0)
        self.user_id = 2
        self.assertEqual(self.action(record, 'start').status_code, 404)

    def test_five_answers_end_question_cycle(self):
        from unittest.mock import AsyncMock, patch
        record = self.create()
        with patch('app.services.interview_coach.coach', new_callable=AsyncMock) as coach:
            coach.return_value = {'preparation': {}, 'question': 'Question'}
            record = self.action(record, 'start').json()
            coach.return_value = {'feedback': {}, 'next_question': 'Suite'}
            for index in range(5):
                record = self.action(record, 'answer', f'Réponse {index}').json()
            self.assertEqual(record['status'], 'review')
            self.assertEqual(len(record['turns']), 5)
            self.assertEqual(self.action(record, 'answer', 'Sixième').status_code, 409)

    def test_cv_rejects_invalid_documents(self):
        response = self.client.post('/api/interviews/extract-cv', files={'file': ('cv.pdf', b'not a PDF')})
        self.assertEqual(response.status_code, 400)


    def test_settings_are_revision_checked_and_locked_after_start(self):
        from unittest.mock import AsyncMock, patch
        record = self.create()
        settings = {'profile': 'Mon CV', 'language': 'en', 'focus': 'technical', 'question_count': 8, 'revision': 0}
        response = self.client.patch(f'/api/interviews/{record["id"]}', json=settings)
        self.assertEqual(response.status_code, 200, response.text)
        record = response.json()
        self.assertEqual(record['profile'], 'Mon CV')
        self.assertEqual(record['revision'], 1)
        self.assertEqual(self.client.patch(f'/api/interviews/{record["id"]}', json=settings).status_code, 409)
        with patch('app.services.interview_coach.coach', new_callable=AsyncMock, return_value={'preparation': {}, 'question': 'Question'}):
            record = self.action(record, 'start').json()
        settings['revision'] = record['revision']
        self.assertEqual(self.client.patch(f'/api/interviews/{record["id"]}', json=settings).status_code, 409)

    def test_concurrent_generation_does_not_overwrite_newer_state(self):
        from unittest.mock import patch
        record = self.create()
        async def competing(*args):
            with Session(self.engine) as session:
                row = session.get(InterviewSession, record['id'])
                row.revision += 1
                row.profile = 'Saved in another tab'
                session.add(row)
                session.commit()
            return {'preparation': {}, 'question': 'Old result'}
        with patch('app.services.interview_coach.coach', side_effect=competing):
            self.assertEqual(self.action(record, 'start').status_code, 409)
        saved = self.client.get(f'/api/interviews/{record["id"]}').json()
        self.assertEqual(saved['profile'], 'Saved in another tab')
        self.assertEqual(saved['turns'], [])


    def test_pdf_requires_completed_owned_session(self):
        from test_interview_pdf import sample_record
        record = self.create()
        path = f'/api/interviews/{record["id"]}/report.pdf'
        self.assertEqual(self.client.get(path).status_code, 409)
        with Session(self.engine) as session:
            row = session.get(InterviewSession, record['id'])
            sample = sample_record()
            row.report, row.turns, row.status = sample.report, sample.turns, 'completed'
            session.add(row)
            session.commit()
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b'%PDF-'))
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertIn('attachment;', response.headers['content-disposition'])
        self.user_id = 2
        self.assertEqual(self.client.get(path).status_code, 404)


class CoachTests(unittest.IsolatedAsyncioTestCase):
    async def test_provider_receives_only_selected_context_and_returns_structured_result(self):
        import json
        from unittest.mock import AsyncMock, patch
        from langchain_core.messages import AIMessage
        from app.services.interview_coach import coach
        record = SimpleNamespace(user_id=12, language='en', company='Example', position='Engineer', profile='Candidate profile',
                                 context={'description': '<p>Build APIs</p>'}, focus='technical', turns=[], question_count=5)
        output = {'preparation': {'role_summary': 'Build APIs', 'priorities': ['Testing'], 'tips': ['Prepare an example']}, 'question': 'Describe your API project.'}
        model = SimpleNamespace(ainvoke=AsyncMock(return_value=AIMessage(content=json.dumps(output))))
        with patch('app.services.interview_coach.get_llm_model', return_value=model) as factory:
            self.assertEqual(await coach(record, 'start'), output)
            self.assertEqual(factory.call_args.args, (12,))
            prompt = model.ainvoke.call_args.args[0].to_messages()
            self.assertIn('English', prompt[0].content)
            payload = json.loads(prompt[1].content)
            self.assertEqual(payload['job'], {'description': 'Build APIs'})
            self.assertEqual(payload['candidate_profile'], 'Candidate profile')

    async def test_malformed_json_retries_then_errors(self):
        from unittest.mock import AsyncMock, patch
        from langchain_core.messages import AIMessage
        from app.services.interview_coach import coach
        from app.services.ai_settings import AIError
        record = SimpleNamespace(user_id=1, language='fr', company='Example', position='Engineer', profile='', context={}, focus='hr', turns=[], question_count=5)
        model = SimpleNamespace(ainvoke=AsyncMock(return_value=AIMessage(content='not json')))
        with patch('app.services.interview_coach.get_llm_model', return_value=model):
            with self.assertRaises(AIError):
                await coach(record, 'start')
        self.assertEqual(model.ainvoke.await_count, 2)

    async def test_report_evidence_must_exist_and_reference_the_correct_answer(self):
        from app.services.interview_coach import ground_report
        answers = [{'number': 1, 'answer': 'J’ai développé un formulaire React.'}, {'number': 2, 'answer': 'Je teste la navigation au clavier.'}]
        result = {'strengths': [{'point': 'Accessibilité', 'evidence': 'Je teste la navigation au clavier.', 'question': 1}], 'improvements': []}
        self.assertEqual(ground_report(result, answers)['strengths'][0]['question'], 2)
        with self.assertRaises(ValueError):
            ground_report({'strengths': [], 'improvements': [{'point': 'Inventé', 'evidence': 'J’ai managé une équipe de dix personnes.', 'question': 1}]}, answers)
