import unittest
from sqlmodel import SQLModel, Session, select, create_engine
from sqlalchemy.pool import StaticPool
from app.models import Application
from app.seed_load_test import seed, DISTRIBUTION, PREFIX


class LoadSeedTests(unittest.TestCase):
    def test_creates_500_once_and_preserves_existing_data(self):
        engine = create_engine("sqlite://", poolclass=StaticPool)
        SQLModel.metadata.create_all(engine)
        try:
            with Session(engine) as session:
                session.add(Application(company="Entreprise réelle", position="Développeur"))
                session.commit()
            result = seed(engine)
            self.assertEqual(result["inserted"], 500)
            self.assertEqual(result["by_status"], DISTRIBUTION)
            self.assertEqual(seed(engine)["inserted"], 0)
            with Session(engine) as session:
                rows = session.exec(select(Application)).all()
                self.assertEqual(len(rows), 501)
                self.assertEqual(sum(row.url is None for row in rows), 1)
                self.assertEqual(len({row.url for row in rows if row.url and row.url.startswith(PREFIX)}), 500)
        finally:
            engine.dispose()
