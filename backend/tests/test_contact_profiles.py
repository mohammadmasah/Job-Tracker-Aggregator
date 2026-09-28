import unittest

from app.services.contact_profiles import answer_contact_profile


class ContactProfileTests(unittest.TestCase):
    def setUp(self):
        self.contact = {"id": 1, "name": "Mohammad", "notes": None,
                        "methods": [{"id": 2, "contact_id": 1, "type": "email", "value": "mohammad@example.com"}],
                        "application_ids": []}
        self.snapshot = {"contacts": [self.contact], "applications": []}

    def test_sparse_profile_has_no_internal_fields_or_missing_labels(self):
        result = answer_contact_profile("Donne-moi toutes les informations de Mohammad.", self.snapshot)
        self.assertEqual(result, "**Mohammad**\n- Email : mohammad@example.com")

    def test_complete_profile_preserves_all_available_details_and_resolves_links(self):
        self.contact.update(notes="Recruteur web", application_ids=[42])
        self.contact["methods"].extend([
            {"type": "phone", "value": "+33 6 00 00 00 00"},
            {"type": "linkedin", "value": "https://linkedin.com/in/example"},
        ])
        self.snapshot["applications"] = [{"id": 42, "company": "Acme", "position": "Développeur React"}]
        result = answer_contact_profile("Les coordonnées de Mohammad", self.snapshot)
        for expected in ["Téléphone : +33 6", "LinkedIn : https://", "Notes : Recruteur web", "Candidatures liées : Acme — Développeur React"]:
            self.assertIn(expected, result)
        self.assertNotIn("42", result)

    def test_names_are_unambiguous_and_technical_requests_still_use_model(self):
        self.assertIsNone(answer_contact_profile("Donne-moi son id en JSON", self.snapshot))
        self.assertIsNone(answer_contact_profile("Les informations de quelqu'un d'autre", self.snapshot))
        self.snapshot["contacts"].append(dict(self.contact))
        self.assertIsNone(answer_contact_profile("Les informations de Mohammad", self.snapshot))

    def test_persian_and_english_labels(self):
        self.assertIn("Email :", answer_contact_profile("Show me all details of Mohammad", self.snapshot))
        self.contact["name"] = "محمد"
        self.assertEqual(answer_contact_profile("تمام مشخصات محمد را بده", self.snapshot), "**محمد**\n- Email : mohammad@example.com")
