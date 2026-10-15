"""Printable interview report; generated locally from the saved session, never another AI call."""
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
import reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak

FONT_DIR = Path(reportlab.__file__).parent / 'fonts'
# Bundle ReportLab's freely redistributable fonts, not a machine-specific font path.
pdfmetrics.registerFont(TTFont('TrackItSans', str(FONT_DIR / 'Vera.ttf')))
pdfmetrics.registerFont(TTFont('TrackItBold', str(FONT_DIR / 'VeraBd.ttf')))
GREEN = colors.HexColor('#15705b')
INK = colors.HexColor('#19352e')
MUTED = colors.HexColor('#61756f')
PALE = colors.HexColor('#edf6f2')
LINE = colors.HexColor('#dce7e2')

LABELS = {
    'fr': {'title': 'Bilan de préparation', 'subtitle': 'ENTRETIEN / RAPPORT PERSONNEL', 'summary': 'Ce que cette séance fait ressortir',
           'strengths': 'Tes points forts', 'improvements': 'Tes axes de progression', 'plan': 'Ton plan d’action',
           'questions': 'À demander à l’entreprise', 'answers': 'Tes réponses, pour continuer à progresser',
           'answer': 'Ta réponse', 'feedback': 'Retour du coach', 'evidence': 'Observation', 'question': 'Question',
           'empty': 'Cette séance ne fournit pas encore assez d’éléments pour relever un point fort précis.',
           'notice': 'Conseils générés par IA à partir de tes réponses. Ils ne constituent ni une évaluation de l’employeur, ni une prédiction de recrutement.',
           'footer': 'TrackIt / Préparation aux entretiens', 'count': 'réponses enregistrées', 'language': 'Français', 'session': 'Séance'},
    'en': {'title': 'Interview preparation report', 'subtitle': 'INTERVIEW / PERSONAL REPORT', 'summary': 'What this session shows',
           'strengths': 'Your strengths', 'improvements': 'Areas to develop', 'plan': 'Your action plan',
           'questions': 'Questions for the employer', 'answers': 'Your answers, for further practice',
           'answer': 'Your answer', 'feedback': 'Coach feedback', 'evidence': 'Observation', 'question': 'Question',
           'empty': 'This session does not yet provide enough evidence to identify a specific strength.',
           'notice': 'AI-generated coaching based on your answers. This is neither an employer assessment nor a prediction of recruitment outcomes.',
           'footer': 'TrackIt / Interview preparation', 'count': 'answers recorded', 'language': 'English', 'session': 'Session'},
}


def render_interview_pdf(record):
    labels = LABELS[record.language]
    buffer = BytesIO()
    width, height = A4
    usable = width - 88
    styles = {
        'title': ParagraphStyle('title', fontName='TrackItBold', fontSize=25, leading=31, textColor=INK, spaceAfter=14),
        'company': ParagraphStyle('company', fontName='TrackItBold', fontSize=15, leading=21, textColor=GREEN, spaceAfter=5),
        'body': ParagraphStyle('body', fontName='TrackItSans', fontSize=10, leading=16, textColor=INK, spaceAfter=9, splitLongWords=True),
        'small': ParagraphStyle('small', fontName='TrackItSans', fontSize=8, leading=12, textColor=MUTED, spaceAfter=7, splitLongWords=True),
        'heading': ParagraphStyle('heading', fontName='TrackItBold', fontSize=14, leading=20, textColor=GREEN, spaceBefore=18, spaceAfter=10, keepWithNext=True),
        'point': ParagraphStyle('point', fontName='TrackItBold', fontSize=10, leading=16, textColor=INK, spaceAfter=5, keepWithNext=True),
        'tag': ParagraphStyle('tag', fontName='TrackItBold', fontSize=8, leading=12, textColor=GREEN, spaceAfter=12),
    }
    def paragraph(text, style='body'):
        clean = ''.join(char for char in str(text) if ord(char) >= 32 or char == '\n')
        return Paragraph(escape(clean).replace('\n', '<br/>'), styles[style])
    def bullets(items):
        return [paragraph(f'{index + 1}. {text}') for index, text in enumerate(items)]
    story = [paragraph(labels['subtitle'], 'tag'), paragraph(labels['title'], 'title'),
             paragraph(record.company, 'company'), paragraph(record.position)]
    answered = [turn for turn in record.turns if turn.get('answer') is not None]
    meta = Table([[paragraph(f'{len(answered)} / {record.question_count}\n{labels["count"]}', 'small'),
                   paragraph(f'{labels["language"]}\n{labels["session"]} #{record.id}', 'small'),
                   paragraph(record.updated_at.strftime('%d/%m/%Y'), 'small')]], colWidths=[usable / 3] * 3)
    meta.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PALE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                             ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                             ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    story.extend([Spacer(1, 8), meta, paragraph(labels['summary'], 'heading'), paragraph(record.report['summary'])])
    for key in ('strengths', 'improvements'):
        story.append(paragraph(labels[key], 'heading'))
        if not record.report[key]:
            story.append(paragraph(labels['empty']))
        for item in record.report[key]:
            story.append(KeepTogether([paragraph(item['point'], 'point'),
                                      paragraph(f'{labels["evidence"]} - {labels["question"].lower()} {item["question"]}', 'small'),
                                      paragraph(item['evidence']), Spacer(1, 5)]))
    story.extend([paragraph(labels['plan'], 'heading'), *bullets(record.report['next_steps']),
                  paragraph(labels['questions'], 'heading'), *bullets(record.report['employer_questions']),
                  Spacer(1, 12), paragraph(labels['notice'], 'small'), PageBreak(), paragraph(labels['answers'], 'title')])
    for number, turn in enumerate(answered, 1):
        if number > 1:
            story.append(PageBreak())
        story.extend([paragraph(f'{labels["question"]} {number}', 'heading'), paragraph(turn['question'], 'point'),
                      paragraph(labels['answer'], 'tag'), paragraph(turn['answer'])])
        feedback = turn.get('feedback') or {}
        for key in ('strengths', 'improvements'):
            if feedback.get(key):
                story.append(paragraph(labels[key], 'point'))
                story.extend(bullets(feedback[key]))
        story.append(Spacer(1, 10))
    def decorate(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(GREEN)
        canvas.rect(0, height - 8, width, 8, fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.line(44, 42, width - 44, 42)
        canvas.setFillColor(MUTED)
        canvas.setFont('TrackItSans', 7.5)
        canvas.drawString(44, 28, labels['footer'])
        canvas.drawRightString(width - 44, 28, str(doc.page))
        canvas.restoreState()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=44, rightMargin=44, topMargin=40, bottomMargin=60,
                            title=f'TrackIt - {record.company} - {labels["title"]}', author='TrackIt')
    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buffer.getvalue()
