"""Add 500 recognizable French demo applications without replacing real data.

Run: python -m app.seed_load_test
Re-running inserts only missing demo records, preserving edits to existing ones.
"""
import json
from collections import Counter
from datetime import datetime, timedelta
from time import perf_counter

from sqlmodel import Session, select

from app.database import engine
from app.models import Application

PREFIX = "https://example.invalid/test-charge-500-v1/"
MARKER = "[TEST DE CHARGE — 500 CANDIDATURES — V1]"
DISTRIBUTION = {
    "to_apply": 70, "applied": 150, "interview": 100, "technical_test": 50,
    "offer": 30, "accepted": 20, "rejected": 80,
}
NOTES = {
    "to_apply": "Offre repérée. CV et lettre de motivation à adapter avant l'envoi.",
    "applied": "Candidature envoyée. Accusé de réception reçu, réponse du recrutement attendue.",
    "interview": "Premier échange positif. Entretien avec l'équipe prévu, présentation des projets à préparer.",
    "technical_test": "Test technique reçu. Exercice à réaliser et documentation à joindre.",
    "offer": "Proposition reçue. Rémunération, missions et date de début à examiner.",
    "accepted": "Proposition acceptée. Documents administratifs en cours de préparation.",
    "rejected": "Réponse négative reçue. Profil conservé pour une prochaine opportunité.",
}
ROLES = [
    ("Développeur web React", "Services numériques"),
    ("Développeur Python", "Logiciels professionnels"),
    ("Développeur Java", "Banque et assurance"),
    ("Développeur applications mobiles", "Télécommunications"),
    ("Analyste de données", "Commerce en ligne"),
    ("Ingénieur systèmes et réseaux", "Infrastructure informatique"),
    ("Chargé de cybersécurité", "Sécurité informatique"),
    ("Concepteur d'interfaces", "Design numérique"),
    ("Chef de projet numérique", "Conseil"),
    ("Technicien qualité logicielle", "Industrie"),
]
CITIES = ["Paris", "Lyon", "Marseille", "Lille", "Bordeaux", "Nantes", "Toulouse", "Rennes", "Strasbourg", "Montpellier"]
COMPANIES = ["Atelier Numérique", "Horizon Logiciels", "Élan Technologies", "Passerelle Conseil", "Rivage Solutions", "Aurore Informatique", "Mosaïque Services", "Cap Innovation", "Clarté Numérique", "Nouvel Essor"]


def demo_applications():
    statuses = [status for status, count in DISTRIBUTION.items() for _ in range(count)]
    # A coprime step spreads statuses across dates, companies and sectors.
    for i in range(500):
        status = statuses[(i * 137) % 500]
        role, sector = ROLES[i % len(ROLES)]
        contract = ("alternance", "stage", "cdi", "cdd")[(i // 10) % 4]
        salary = ("1 200 à 1 700 €/mois" if contract == "alternance" else
                  "900 à 1 200 €/mois" if contract == "stage" else
                  f"{35 + i % 20} 000 à {40 + i % 20} 000 €/an")
        yield Application(
            company=f"{COMPANIES[(i // 7) % len(COMPANIES)]} — Démo {i + 1:03d}",
            position=role, sector=sector, location=CITIES[(i // 3) % len(CITIES)],
            salary=salary, remote=i % 3 == 0, type=contract, status=status,
            applied_at=datetime(2026, 9, 27, 9) - timedelta(days=(i * 17) % 180),
            url=f"{PREFIX}{i + 1:03d}",
            notes=f"{MARKER}\nDonnées fictives pour tester l'application. {NOTES[status]}",
        )


def seed(database_engine=engine):
    started = perf_counter()
    with Session(database_engine) as session:
        existing = set(session.exec(select(Application.url).where(Application.url.startswith(PREFIX))).all())
        new_rows = [row for row in demo_applications() if row.url not in existing]
        session.add_all(new_rows)
        session.commit()
        rows = session.exec(select(Application).where(Application.url.startswith(PREFIX))).all()
        return {"inserted": len(new_rows), "demo_total": len(rows),
                "by_status": dict(Counter(row.status for row in rows)),
                "elapsed_seconds": round(perf_counter() - started, 3)}


if __name__ == "__main__":
    print(json.dumps(seed(), ensure_ascii=False, indent=2))
