from datetime import datetime
from io import BytesIO
from types import SimpleNamespace
import unittest
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from app.api.deps import get_current_user
from app.database import get_session
from app.models import Application, Contact, ContactMethod
from app.routes.applications import router
from app.services.application_export import export_applications

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def inspect_xlsx(data):
    with ZipFile(BytesIO(data)) as archive:
        strings = [''.join(item.itertext()) for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        sheets = []
        for index in (1, 2):
            root = ET.fromstring(archive.read(f'xl/worksheets/sheet{index}.xml'))
            cells = {}
            for cell in root.findall('.//s:c', NS):
                value = cell.find('s:v', NS)
                if value is not None:
                    cells[cell.attrib['r']] = strings[int(value.text)] if cell.get('t') == 's' else value.text
            sheets.append((root, cells))
        return strings, sheets


class ApplicationExportTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        app = FastAPI()
        app.include_router(router)
        def session():
            with Session(self.engine) as database:
                yield database
        app.dependency_overrides[get_session] = session
        self.app = app
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
        self.client = TestClient(app)
        with Session(self.engine) as session:
            for index in range(20):
                status = 'rejected' if index < 5 else 'interview' if index < 7 else 'applied'
                application = Application(company=f'Entreprise {index:02}', position='Développeur web', status=status,
                                          notes='DESCRIPTION_NE_DOIT_PAS_SORTIR', applied_at=datetime(2026, 10, 1),
                                          url='https://example.com/offre', remote=True)
                if index == 0:
                    contact = Contact(name='Camille', notes='NOTES_CONTACT_PRIVEES', applications=[application])
                    session.add(contact)
                    session.add_all([ContactMethod(contact=contact, type='email', value=value)
                                     for value in ('camille@example.com', 'recrutement@example.com')])
                    session.add(ContactMethod(contact=contact, type='phone', value='+33 6 01 02 03 04'))
                    session.add(Contact(name='Alex', applications=[application]))
                session.add(application)
            session.commit()

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def test_complete_export_counts_contacts_and_no_descriptions(self):
        long_url = 'https://example.com/offre?tracking=' + 'parametre-long-' * 250
        with Session(self.engine) as session:
            application = session.get(Application, 1)
            application.url = long_url
            session.add(application)
            session.commit()
        response = self.client.get('/api/applications/export.xlsx')
        self.assertEqual(response.status_code, 200)
        self.assertIn('spreadsheetml.sheet', response.headers['content-type'])
        self.assertIn('.xlsx', response.headers['content-disposition'])
        self.assertEqual(response.headers['cache-control'], 'no-store')
        strings, ((_, summary), (detail, cells)) = inspect_xlsx(response.content)
        self.assertEqual((summary['B8'], summary['B9'], summary['B11'], summary['B15']), ('13', '2', '5', '20'))
        rows = [cell for cell in detail.findall('.//s:row', NS) if int(cell.attrib['r']) >= 7]
        self.assertEqual(len(rows), 20)
        self.assertTrue(all(row.get('ht') == '42' and row.get('customHeight') == '1' for row in rows))
        self.assertIn(long_url, strings)
        self.assertEqual(cells['A7'], 'Postulé')
        self.assertEqual(cells['D7'], '46296')  # Native Excel date, not preformatted text.
        self.assertIn('Camille — camille@example.com\nCamille — recrutement@example.com', strings)
        self.assertIn('Camille — +33 6 01 02 03 04', strings)
        self.assertNotIn('DESCRIPTION_NE_DOIT_PAS_SORTIR', strings)
        self.assertNotIn('NOTES_CONTACT_PRIVEES', strings)
        self.assertEqual(detail.find('s:sheetViews/s:sheetView/s:pane', NS).get('topLeftCell'), 'D7')

    def test_filtered_and_empty_exports_and_validation(self):
        response = self.client.get('/api/applications/export.xlsx?status=rejected')
        _, ((_, summary), (_, cells)) = inspect_xlsx(response.content)
        self.assertEqual(summary['B15'], '5')
        self.assertEqual([v for k, v in cells.items() if k.startswith('A') and k[1:].isdigit() and int(k[1:]) >= 7], ['Refusée'] * 5)
        empty = self.client.get('/api/applications/export.xlsx?status=accepted')
        _, ((_, summary), (_, cells)) = inspect_xlsx(empty.content)
        self.assertEqual(summary['B15'], '0')
        self.assertEqual(cells['A7'], 'Aucune candidature pour cette sélection.')
        self.assertEqual(self.client.get('/api/applications/export.xlsx?status=invalid').status_code, 422)

    def test_requires_login(self):
        self.app.dependency_overrides.pop(get_current_user)
        self.assertEqual(self.client.get('/api/applications/export.xlsx').status_code, 401)

    def test_500_rows_and_literal_user_values(self):
        applications = [Application(id=index, company=f'Entreprise {index}', position='Développeur',
                                    status='rejected' if index % 2 else 'interview') for index in range(500)]
        applications[0].company = '=HYPERLINK("https://example.com", "injection")'
        applications[1].position = '+33123456789'
        strings, ((_, summary), (detail, cells)) = inspect_xlsx(export_applications(applications))
        self.assertEqual(summary['B15'], '500')
        self.assertEqual((summary['B9'], summary['B11']), ('250', '250'))
        self.assertEqual(len(detail.findall('.//s:row', NS)) - 4, 500)
        self.assertIn(applications[0].company, strings)
        self.assertIn('+33123456789', strings)
        self.assertEqual(detail.findall('.//s:f', NS), [])


if __name__ == '__main__':
    unittest.main()
