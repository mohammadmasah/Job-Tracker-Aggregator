import json
import unittest
from unittest.mock import patch

from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

from app.models import Application, Contact, ContactMethod, ContactApplicationLink, Document, Offer
from app.services import ai_agents
from app.services.chat_counts import answer_count_question


class ChatbotDataTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.engine_patch = patch.object(ai_agents, "engine", self.engine)
        self.engine_patch.start()

    def tearDown(self):
        self.engine_patch.stop()
        self.engine.dispose()

    def snapshot(self):
        return json.loads(ai_agents.get_user_applications_context())

    def test_no_applications_does_not_hide_contacts_or_offers(self):
        with Session(self.engine) as session:
            session.add(Contact(name="Recruiter"))
            session.add(Offer(source="test", title="React Developer"))
            session.commit()
        data = self.snapshot()
        self.assertEqual(data["summary"]["total_applications"], 0)
        self.assertEqual(data["summary"]["total_contacts"], 1)
        self.assertEqual(data["contacts"][0]["name"], "Recruiter")
        self.assertEqual(data["job_offers"][0]["title"], "React Developer")

    def test_all_offers_are_included_with_their_own_salary(self):
        with Session(self.engine) as session:
            session.add(Offer(source="test", title="First", salary_min=30000))
            session.add(Offer(source="test", title="Second", salary_min=40000))
            session.commit()
        data = self.snapshot()
        self.assertEqual(data["summary"]["total_job_offers"], 2)
        self.assertEqual([o["salary_min"] for o in data["job_offers"]], [30000, 40000])

    def test_counts_are_fresh_and_drafts_are_separate(self):
        self.assertEqual(self.snapshot()["summary"]["total_applications"], 0)
        with Session(self.engine) as session:
            for status in ("to_apply", "applied", "interview", "rejected"):
                session.add(Application(company="Test", position="Developer", status=status))
            session.commit()
        summary = self.snapshot()["summary"]
        self.assertEqual(summary["total_applications"], 4)
        self.assertEqual(summary["submitted_applications"], 3)
        self.assertEqual(summary["applications_by_status"]["interview"], 1)

    def test_contact_links_and_document_metadata_are_available(self):
        with Session(self.engine) as session:
            session.add(Application(id=1, company="Test", position="Developer", location="Paris", salary="40k"))
            session.add(Contact(id=1, name="Recruiter"))
            session.commit()
            session.add(ContactMethod(contact_id=1, type="email", value="test@example.com"))
            session.add(ContactApplicationLink(contact_id=1, application_id=1))
            session.add(Document(application_id=1, filename="cv.pdf", path="/private/files/cv.pdf"))
            session.commit()
        data = self.snapshot()
        self.assertEqual(data["contacts"][0]["application_ids"], [1])
        self.assertEqual(data["contacts"][0]["methods"][0]["value"], "test@example.com")
        self.assertEqual(data["applications"][0]["location"], "Paris")
        self.assertEqual(data["documents"][0]["filename"], "cv.pdf")
        self.assertNotIn("path", data["documents"][0])

    def test_simple_counts_are_exact_and_filtered_questions_use_model(self):
        summary = {"total_applications": 8, "submitted_applications": 5, "total_contacts": 2,
                   "total_job_offers": 3, "total_documents": 1}
        self.assertEqual(answer_count_question("چند تا کاندید کردم؟", summary), "Tu as 5 candidature(s) au total.")
        self.assertEqual(answer_count_question("چند مخاطب دارم؟", summary), "Tu as 2 contact(s) au total.")
        self.assertIn("8", answer_count_question("Combien de candidatures ai-je ?", summary))
        self.assertIn("2", answer_count_question("How many contacts do I have?", summary))
        self.assertIsNone(answer_count_question("Combien de candidatures chez Google ?", summary))
        self.assertIsNone(answer_count_question("چند درخواست برای شرکت گوگل دارم؟", summary))
