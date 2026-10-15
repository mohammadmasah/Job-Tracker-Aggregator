import io
from datetime import datetime
from types import SimpleNamespace
import unittest
import pdfplumber
from app.services.interview_pdf import render_interview_pdf


def sample_record(language='fr', long=False):
    answer = ('J’ai créé une interface accessible avec des labels. ' * 60) if long else 'J’ai testé mon formulaire au clavier et corrigé les labels.'
    return SimpleNamespace(id=12, company='Atelier <Horizon> & associés', position='Développeur web – équipe produit',
        language=language, question_count=5, updated_at=datetime(2026, 10, 15),
        report={'summary': 'Une expérience concrète à présenter.',
            'strengths': [{'point': 'Accessibilité', 'evidence': 'Tests au clavier', 'question': 1}],
            'improvements': [{'point': 'Préciser les résultats', 'evidence': 'Le résultat n’est pas mesuré.', 'question': 1}],
            'next_steps': ['Préparer une mesure avant/après.'], 'employer_questions': ['Comment se déroulent les revues de code ?']},
        turns=[{'question': 'Comment as-tu amélioré ton interface ?', 'answer': answer,
                'feedback': {'strengths': ['Exemple concret'], 'improvements': ['Décrire le résultat.']}},
               {'question': 'Question non répondue', 'answer': None, 'feedback': None}])


class PDFTests(unittest.TestCase):
    def test_report_contains_evidence_and_answers_with_embedded_fonts(self):
        data = render_interview_pdf(sample_record())
        self.assertTrue(data.startswith(b'%PDF-'))
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            text = '\n'.join(page.extract_text() for page in pdf.pages)
            self.assertIn('Bilan de préparation', text)
            self.assertIn('Atelier <Horizon> & associés', text)
            self.assertIn('Tes axes de progression', text)
            self.assertIn('J’ai testé mon formulaire', text)
            self.assertNotIn('Question non répondue', text)
            self.assertGreaterEqual(len(pdf.pages), 2)
            self.assertTrue(any('BitstreamVera' in char.get('fontname', '') for page in pdf.pages for char in page.chars))

    def test_long_answer_wraps_without_leaving_page_bounds(self):
        with pdfplumber.open(io.BytesIO(render_interview_pdf(sample_record(long=True)))) as pdf:
            for page in pdf.pages:
                for word in page.extract_words():
                    self.assertGreaterEqual(word['x0'], 40)
                    self.assertLessEqual(word['x1'], page.width - 40)
                    self.assertGreaterEqual(word['top'], 20)
                    self.assertLessEqual(word['bottom'], page.height - 20)

    def test_english_report_labels(self):
        with pdfplumber.open(io.BytesIO(render_interview_pdf(sample_record('en')))) as pdf:
            text = '\n'.join(page.extract_text() for page in pdf.pages)
            self.assertIn('Interview preparation report', text)
            self.assertIn('Areas to develop', text)
