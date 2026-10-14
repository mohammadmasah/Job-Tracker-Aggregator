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
