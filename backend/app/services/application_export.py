"""Portable XLSX export of the applications workspace, without descriptions."""
from collections import Counter
from datetime import datetime
from io import BytesIO
import math

import xlsxwriter


STATUSES = {
    'applied': ('Postulé', '#E0F2FE', '#075985'),
    'interview': ('Entretien', '#F3E8FF', '#6B21A8'),
    'technical_test': ('Test technique', '#FEF3C7', '#92400E'),
    'rejected': ('Refusée', '#FFE4E6', '#9F1239'),
    'offer': ('Offre', '#FAE8FF', '#86198F'),
    'accepted': ('Acceptée', '#DCFCE7', '#166534'),
    'to_apply': ('À postuler', '#E2E8F0', '#334155'),
}
TYPES = {'alternance': 'Alternance', 'stage': 'Stage', 'cdi': 'CDI', 'cdd': 'CDD',
         'freelance': 'Freelance', 'interim': 'Intérim', 'intérim': 'Intérim'}
COLUMNS = [
    ('Statut', 20), ('Entreprise', 28), ('Poste', 42), ('Date de candidature', 22),
    ('Contrat', 18), ('Localisation', 25), ('Télétravail', 15), ('Salaire', 22),
    ('Secteur', 22), ('Contacts', 28), ('E-mails', 44), ('Téléphones', 32),
    ('LinkedIn', 48), ('Autres coordonnées', 35), ("Lien de l’offre", 48),
]


def contact_details(contacts):
    names, methods = [], {key: [] for key in ('email', 'phone', 'linkedin', 'other')}
    for contact in sorted(contacts, key=lambda item: (item.name.casefold(), item.id or 0)):
        names.append(contact.name)
        for method in sorted(contact.methods, key=lambda item: item.id or 0):
            kind = method.type if method.type in methods else 'other'
            value = f'{contact.name} — {method.value}'
            if value not in methods[kind]:
                methods[kind].append(value)
    return ['\n'.join(names)] + ['\n'.join(methods[key]) for key in methods]


def export_applications(applications, status=None, generated_at=None):
    generated_at = generated_at or datetime.now()
    order = {key: index for index, key in enumerate(STATUSES)}
    applications = sorted(applications, key=lambda app: (
        order.get(app.status, len(order)), app.company.casefold(), app.position.casefold(), app.id or 0))
    output = BytesIO()
    with xlsxwriter.Workbook(output, {'in_memory': True, 'strings_to_formulas': False,
                                     'strings_to_urls': False}) as book:
        book.set_properties({'title': 'TrackIt — Mes candidatures', 'author': 'TrackIt'})
        base = {'font_name': 'Calibri', 'font_size': 11, 'font_color': '#0F172A', 'valign': 'top'}
        normal = book.add_format({**base, 'text_wrap': True})
        title = book.add_format({**base, 'font_size': 22, 'bold': True, 'font_color': '#FFFFFF', 'bg_color': '#0F172A'})
        muted = book.add_format({**base, 'font_size': 10, 'font_color': '#64748B'})
        header = book.add_format({**base, 'bold': True, 'bg_color': '#1E293B', 'font_color': '#FFFFFF', 'text_wrap': True})
        number = book.add_format({**base, 'num_format': '#,##0', 'align': 'right'})
        date = book.add_format({**base, 'num_format': 'dd/mm/yyyy'})
        total = book.add_format({**base, 'bold': True, 'bg_color': '#E2E8F0', 'num_format': '#,##0'})
        status_formats = {key: book.add_format({**base, 'bold': True, 'bg_color': colors[1], 'font_color': colors[2]})
                          for key, colors in STATUSES.items()}
        summary = book.add_worksheet('Synthèse')
        detail = book.add_worksheet('Candidatures')
        scope = STATUSES[status][0] if status else 'Toutes les candidatures'
        for sheet in (summary, detail):
            sheet.hide_gridlines(2)
            sheet.set_default_row(23)
            sheet.set_tab_color('#0F766E')
        summary.set_column('A:A', 27)
        summary.set_column('B:B', 16)
        summary.set_column('C:D', 23)
        summary.merge_range('A1:D2', 'TrackIt · Mes candidatures', title)
        summary.merge_range('A4:D4', scope, normal)
        summary.merge_range('A5:D5', f'Export du {generated_at:%d/%m/%Y à %H:%M}', muted)
        summary.write_row('A7', ['Statut', 'Nombre'], header)
        counts = Counter(app.status for app in applications)
        statuses = list(STATUSES)
        if any(key not in STATUSES for key in counts):
            statuses.append('unknown')
        for row, key in enumerate(statuses, start=7):
            label = STATUSES.get(key, ('Autre statut',))[0]
            summary.write_string(row, 0, label, status_formats.get(key, normal))
            value = counts.get(key, 0) if key != 'unknown' else sum(v for k, v in counts.items() if k not in STATUSES)
            if applications:
                summary.write_formula(row, 1, f'=COUNTIF(Candidatures!$A$7:$A${6 + len(applications)},A{row + 1})', number, value)
            else:
                summary.write_number(row, 1, 0, number)
        total_row = 7 + len(statuses)
        summary.write_string(total_row, 0, 'Total des candidatures', total)
        summary.write_formula(total_row, 1, f'=SUM(B8:B{total_row})', total, len(applications))
        summary.merge_range(total_row + 3, 0, total_row + 3, 3, 'Une ligne par candidature dans l’onglet Candidatures.', muted)
        summary.merge_range(total_row + 4, 0, total_row + 4, 3, 'Les descriptions et notes ne sont pas incluses.', muted)
        summary.freeze_panes(7, 0)
        summary.set_portrait()
        summary.fit_to_pages(1, 1)
        summary.print_area(0, 0, total_row + 4, 3)

        detail.merge_range('A1:F2', 'TrackIt · Détail des candidatures', title)
        detail.merge_range('A4:F4', f'{len(applications)} candidature(s) · {scope} · {generated_at:%d/%m/%Y}', muted)
        detail.merge_range('G4:O4', 'Coordonnées des contacts liés · Descriptions et notes exclues', muted)
        for col, (_, width) in enumerate(COLUMNS):
            detail.set_column(col, col, width, normal)
        detail.set_row(5, 32)
        if applications:
            detail.add_table(5, 0, 5 + len(applications), len(COLUMNS) - 1, {
                'name': 'Candidatures', 'style': 'Table Style Medium 2',
                'columns': [{'header': name, 'header_format': header} for name, _ in COLUMNS]})
        else:
            detail.write_row(5, 0, [name for name, _ in COLUMNS], header)
            detail.merge_range('A7:F7', 'Aucune candidature pour cette sélection.', muted)
        for row, app in enumerate(applications, start=6):
            values = [STATUSES.get(app.status, ('Autre statut',))[0], app.company, app.position,
                      app.applied_at.date() if app.applied_at else None,
                      TYPES.get((app.type or '').lower(), app.type or ''), app.location or '',
                      'Oui' if app.remote else 'Non', app.salary or '', app.sector or '',
                      *contact_details(app.contacts), app.url or '']
            for col, value in enumerate(values):
                if col == 3 and value:
                    detail.write_datetime(row, col, value, date)
                else:
                    detail.write(row, col, value, status_formats.get(app.status, normal) if col == 0 else normal)
            lines = max(sum(max(1, math.ceil(len(line) / (COLUMNS[col][1] - 3))) for line in str(value or '').split('\n'))
                        for col, value in enumerate(values))
            detail.set_row(row, min(409, max(32, lines * 16 + 8)))
        detail.freeze_panes(6, 3)
        detail.set_landscape()
        detail.set_paper(8)  # A3 for the wide contact directory.
        detail.fit_to_pages(1, 0)
        detail.repeat_rows(5)
        detail.print_area(0, 0, max(6, len(applications) + 5), len(COLUMNS) - 1)
        detail.set_footer('TrackIt · &P / &N')
    return output.getvalue()
