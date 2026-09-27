import unittest
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from app.routes import applications, contacts
from app.database import get_session
from app.api.deps import get_current_user


class ApplicationSaveTests(unittest.TestCase):
    def test_create_reload_update_and_link_contact(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        app = FastAPI()
        app.include_router(applications.router)
        app.include_router(contacts.router)

        def session():
            with Session(engine) as database:
                yield database

        app.dependency_overrides[get_session] = session
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
        try:
            with TestClient(app) as client:
                response = client.post("/api/applications", json={"company": "Acme", "position": "Développeur React", "status": "applied", "applied_at": "2026-09-27", "remote": True})
                self.assertEqual(response.status_code, 200, response.text)
                application_id = response.json()["id"]
                self.assertEqual(client.get("/api/applications").json()[0]["company"], "Acme")
                update = client.patch(f"/api/applications/{application_id}", json={"status": "interview"})
                self.assertEqual(update.status_code, 200)
                client.post("/api/contacts", json={"name": "Recruiter", "application_ids": [application_id]})
                saved = client.get(f"/api/applications/{application_id}").json()
                self.assertEqual(saved["status"], "interview")
                self.assertEqual(saved["contacts"][0]["name"], "Recruiter")
        finally:
            engine.dispose()
