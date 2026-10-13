import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from app.models import Application, Document
from app.database import get_session
from app.api.deps import get_current_user
from app.routes import documents


class DocumentsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.uploads = self.root / 'uploads'
        self.engine = create_engine(f'sqlite:///{self.root / "test.db"}', connect_args={'check_same_thread': False})
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([Application(id=1, company='Havas', position='Développeur'), Application(id=2, company='Autre', position='Stage')])
            session.commit()
        self.app = FastAPI()
        self.app.include_router(documents.router)
        self.app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
        def sessions():
            with Session(self.engine) as session:
                yield session
        self.app.dependency_overrides[get_session] = sessions
        self.upload_patch = patch.object(documents, 'UPLOAD_DIR', self.uploads)
        self.upload_patch.start()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.upload_patch.stop()
        self.engine.dispose()
        self.directory.cleanup()

    def upload(self, app_id=1, name='CV.pdf', content=b'%PDF sample'):
        return self.client.post(f'/api/documents/{app_id}', data={'type': 'cv'}, files={'file': (name, content, 'application/pdf')})

    def test_upload_list_download_delete_lifecycle(self):
        response = self.upload()
        self.assertEqual(response.status_code, 200, response.text)
        document = response.json()
        self.assertEqual(document['application_id'], 1)
        self.assertEqual(document['type'], 'cv')
        self.assertNotIn('path', document)
        self.assertEqual(self.client.get('/api/documents?application_id=1').json(), [document])
        self.assertEqual(self.client.get('/api/documents?application_id=2').json(), [])
        self.engine.dispose()
        download = self.client.get(f'/api/documents/{document["id"]}/download')
        self.assertEqual(download.content, b'%PDF sample')
        self.assertIn('attachment;', download.headers['content-disposition'])
        self.assertEqual(download.headers['cache-control'], 'no-store')
        self.assertEqual(self.client.delete(f'/api/documents/{document["id"]}').status_code, 200)
        self.assertEqual(list(self.uploads.iterdir()), [])
        self.assertEqual(self.client.get('/api/documents?application_id=1').json(), [])
        self.assertEqual(self.client.get(f'/api/documents/{document["id"]}/download').status_code, 404)

    def test_identical_filenames_do_not_overwrite(self):
        first = self.upload(content=b'first').json()['id']
        second = self.upload(content=b'second').json()['id']
        self.assertNotEqual(first, second)
        self.assertEqual(self.client.get(f'/api/documents/{first}/download').content, b'first')
        self.assertEqual(self.client.get(f'/api/documents/{second}/download').content, b'second')

    def test_empty_oversize_missing_application_leave_no_files(self):
        self.assertEqual(self.upload(999).status_code, 404)
        self.assertEqual(self.upload(content=b'').status_code, 400)
        with patch.object(documents, 'MAX_FILE_BYTES', 4):
            self.assertEqual(self.upload(content=b'12345').status_code, 413)
        self.assertEqual(self.client.get('/api/documents').json(), [])
        self.assertEqual(list(self.uploads.iterdir()), [])

    def test_filename_is_not_a_storage_path(self):
        document = self.upload(name='../outside.html', content=b'<script>alert(1)</script>').json()
        self.assertEqual(document['filename'], 'outside.html')
        self.assertFalse((self.root / 'outside.html').exists())
        response = self.client.get(f'/api/documents/{document["id"]}/download')
        self.assertEqual(response.headers['content-type'], 'application/octet-stream')
        self.assertEqual(response.headers['x-content-type-options'], 'nosniff')

    def test_legacy_outside_path_cannot_be_downloaded_or_deleted(self):
        secret = self.root / 'outside.txt'
        secret.write_text('private')
        with Session(self.engine) as session:
            row = Document(application_id=1, filename='outside.txt', path=str(secret))
            session.add(row); session.commit(); session.refresh(row)
            identifier = row.id
        self.assertEqual(self.client.get(f'/api/documents/{identifier}/download').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/documents/{identifier}').status_code, 404)
        self.assertTrue(secret.exists())

    def test_missing_file_can_still_remove_record(self):
        identifier = self.upload().json()['id']
        for path in self.uploads.iterdir():
            path.unlink()
        self.assertEqual(self.client.get(f'/api/documents/{identifier}/download').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/documents/{identifier}').status_code, 200)

    def test_database_failure_removes_partial_upload(self):
        with patch.object(Session, 'commit', side_effect=RuntimeError('DB unavailable')):
            with self.assertRaises(RuntimeError):
                self.upload()
        self.assertEqual(list(self.uploads.iterdir()), [])
        with Session(self.engine) as session:
            self.assertEqual(session.exec(select(Document)).all(), [])

    def test_all_routes_require_authentication(self):
        self.app.dependency_overrides.pop(get_current_user)
        self.assertEqual(self.upload().status_code, 401)
        self.assertEqual(self.client.get('/api/documents').status_code, 401)
        self.assertEqual(self.client.get('/api/documents/1/download').status_code, 401)
        self.assertEqual(self.client.delete('/api/documents/1').status_code, 401)
