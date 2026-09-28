import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine, select
from app.models import Application, Contact, ContactMethod, Document
from app.routes.applications import delete_application
from app.routes.contacts import delete_contact


class DeletionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        @event.listens_for(self.engine, 'connect')
        def foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def records(self):
        app = Application(company='Entreprise test', position='Développeur')
        other = Application(company='Autre entreprise', position='Designer')
        contact = Contact(name='Camille', applications=[app, other])
        method = ContactMethod(contact=contact, type='email', value='test@example.invalid')
        self.session.add_all([app, other, contact, method])
        self.session.commit()
        return app.id, other.id, contact.id, method.id

    def test_application_deletion_preserves_shared_contact_and_other_application(self):
        app_id, other_id, contact_id, method_id = self.records()
        with tempfile.TemporaryDirectory(dir='.') as directory:
            root = Path(directory).resolve()
            attachment = root / 'cv.pdf'
            attachment.write_bytes(b'test')
            doc = Document(application_id=app_id, filename='cv.pdf', path=str(attachment))
            self.session.add(doc)
            self.session.commit()
            # Substitute only the upload root, keeping real attachment path resolution.
            real_path = Path
            with patch('app.routes.applications.Path', side_effect=lambda value: root if value == 'uploads' else real_path(value)):
                delete_application(app_id, self.session)
            self.assertFalse(attachment.exists())
        self.session.expire_all()
        self.assertIsNone(self.session.get(Application, app_id))
        self.assertIsNotNone(self.session.get(Application, other_id))
        contact = self.session.get(Contact, contact_id)
        self.assertEqual([a.id for a in contact.applications], [other_id])
        self.assertIsNotNone(self.session.get(ContactMethod, method_id))
        self.assertEqual(self.session.exec(select(Document)).all(), [])

    def test_contact_deletion_removes_methods_but_preserves_applications(self):
        app_id, other_id, contact_id, method_id = self.records()
        delete_contact(contact_id, self.session)
        self.session.expire_all()
        self.assertIsNone(self.session.get(Contact, contact_id))
        self.assertIsNone(self.session.get(ContactMethod, method_id))
        for app_id in [app_id, other_id]:
            app = self.session.get(Application, app_id)
            self.assertIsNotNone(app)
            self.assertEqual(app.contacts, [])

    def test_missing_records_return_404(self):
        for delete in [delete_contact, delete_application]:
            with self.assertRaises(HTTPException) as error:
                delete(999, self.session)
            self.assertEqual(error.exception.status_code, 404)
