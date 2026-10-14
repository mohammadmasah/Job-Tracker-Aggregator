"""Search existing workspace jobs and keep each account's interview practice private."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field as InputField
from sqlmodel import Session, select
from sqlalchemy import func, or_
from app.api.deps import get_current_user
from app.database import get_session
from app.models import Application, Offer, User
from app.models.interview import InterviewSession

router = APIRouter(prefix='/api/interviews', tags=['Interview practice'])


def owned(session, id, user_id):
    row = session.get(InterviewSession, id)
    if not row or row.user_id != user_id:
        raise HTTPException(404, 'Séance introuvable.')
    return row


def summary(row):
    return {key: getattr(row, key) for key in ('id', 'source_kind', 'source_id', 'company', 'position',
            'language', 'focus', 'question_count', 'status', 'created_at', 'updated_at', 'revision')} | {
        'answered': sum(turn.get('answer') is not None for turn in row.turns)}


def public(row):
    return summary(row) | {key: getattr(row, key) for key in ('context', 'profile', 'turns', 'preparation', 'report')}


def source_context(session, kind, id):
    model = Application if kind == 'application' else Offer
    row = session.get(model, id)
    if not row:
        raise HTTPException(404, 'Cette candidature ou offre n’existe plus.')
    fields = ('company', 'position', 'notes', 'location', 'sector', 'type', 'salary', 'remote', 'url', 'status') if kind == 'application' else (
        'company', 'title', 'description', 'descriptionPreview', 'localisation', 'sectors', 'skills', 'start',
        'salary_currency', 'salary_min', 'salary_max', 'url', 'source')
    return {field: getattr(row, field) for field in fields}


@router.get('/sources')
def sources(q: str = Query('', max_length=160), kind: Literal['all', 'application', 'offer'] = 'all',
            limit: int = Query(30, ge=1, le=50), offset: int = Query(0, ge=0),
            user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    groups, total = [], 0
    # Escape LIKE wildcards: a search is literal user text, not a database pattern.
    needle = '%' + q.strip().lower().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
    for category, model, title in [('application', Application, Application.position), ('offer', Offer, Offer.title)]:
        if kind not in ('all', category):
            continue
        condition = or_(func.lower(model.company).like(needle, escape='\\'), func.lower(title).like(needle, escape='\\'))
        count = session.exec(select(func.count()).select_from(model).where(condition)).one()
        total += count
        group_offset = min(offset, count)
        offset -= group_offset
        query = select(model).where(condition).order_by(model.id.desc()).offset(group_offset).limit(max(0, limit - len(groups)))
        for row in session.exec(query).all():
            groups.append({'kind': category, 'id': row.id, 'company': row.company or 'Entreprise non précisée',
                           'position': row.position if category == 'application' else row.title,
                           'location': row.location if category == 'application' else ', '.join(row.localisation or []),
                           'has_description': bool(row.notes if category == 'application' else row.description or row.descriptionPreview)})
    return {'items': groups, 'total': total}


class CreateSession(BaseModel):
    source_kind: Literal['application', 'offer']
    source_id: int = InputField(gt=0)
    profile: str = InputField('', max_length=8000)
    language: Literal['fr', 'en'] = 'fr'
    focus: Literal['mixed', 'hr', 'technical'] = 'mixed'
    question_count: Literal[5, 8] = 5


@router.post('', status_code=201)
def create(data: CreateSession, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    context = source_context(session, data.source_kind, data.source_id)
    row = InterviewSession(user_id=user.id, **data.model_dump(), context=context,
                           company=context.get('company') or 'Entreprise non précisée',
                           position=context.get('position') or context.get('title') or 'Poste')
    session.add(row)
    session.commit()
    session.refresh(row)
    return public(row)


@router.get('')
def history(user: User = Depends(get_current_user), session: Session = Depends(get_session),
            offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=50)):
    rows = session.exec(select(InterviewSession).where(InterviewSession.user_id == user.id)
                        .order_by(InterviewSession.updated_at.desc(), InterviewSession.id.desc()).offset(offset).limit(limit)).all()
    return [summary(row) for row in rows]


@router.get('/{id}')
def read(id: int, response: Response, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    response.headers['Cache-Control'] = 'no-store'
    return public(owned(session, id, user.id))


@router.delete('/{id}', status_code=204)
def delete(id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    session.delete(owned(session, id, user.id))
    session.commit()
    return Response(status_code=204)


class PracticeAction(BaseModel):
    action: Literal['start', 'answer', 'finish']
    answer: str = InputField('', max_length=3000)
    revision: int = InputField(ge=0)
    request_id: str = InputField(pattern=r'^[a-zA-Z0-9-]{16,64}$')


@router.post('/{id}/practice')
async def practice(id: int, data: PracticeAction, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    import asyncio
    from copy import deepcopy
    from datetime import datetime
    from sqlalchemy import update
    from app.services.interview_coach import coach
    from app.services.ai_settings import AIError
    from httpx import TimeoutException
    row = owned(session, id, user.id)
    if row.last_request_id == data.request_id:
        return public(row)
    if row.revision != data.revision:
        raise HTTPException(409, 'La séance a changé. Recharge-la avant de continuer.')
    answered = sum(turn.get('answer') is not None for turn in row.turns)
    if data.action == 'start' and row.status != 'ready':
        raise HTTPException(409, 'Cette séance a déjà commencé.')
    if data.action == 'answer' and (row.status != 'practicing' or not row.turns or row.turns[-1].get('answer') is not None or not data.answer.strip()):
        raise HTTPException(409, 'Aucune question en attente ou réponse vide.')
    if data.action == 'finish' and (row.status not in ('practicing', 'review') or not answered):
        raise HTTPException(409, 'Réponds à au moins une question avant de demander ton bilan.')
    # Release the read transaction while the model works. A revision check below
    # prevents two tabs or retries from overwriting one another after generation.
    session.expunge(row)
    session.rollback()
    try:
        async with asyncio.timeout(150):
            result = await coach(row, data.action, data.answer.strip())
    except AIError as error:
        raise HTTPException(502, str(error)) from None
    except (TimeoutError, TimeoutException):
        raise HTTPException(504, 'Le coach met trop de temps à répondre. Ta séance est conservée ; réessaie.') from None
    except Exception:
        raise HTTPException(502, 'Le coach est indisponible. Vérifie ton assistant IA puis réessaie. Ta séance est conservée.') from None
    turns = deepcopy(row.turns)
    changes = {'updated_at': datetime.utcnow(), 'revision': row.revision + 1, 'last_request_id': data.request_id}
    if data.action == 'start':
        changes.update(preparation=result['preparation'], turns=[{'question': result['question'], 'answer': None, 'feedback': None}], status='practicing')
    elif data.action == 'answer':
        turns[-1].update(answer=data.answer.strip(), feedback=result['feedback'])
        if answered + 1 < row.question_count:
            turns.append({'question': result['next_question'], 'answer': None, 'feedback': None})
        changes.update(turns=turns, status='review' if answered + 1 >= row.question_count else 'practicing')
    else:
        changes.update(report=result, status='completed')
    updated = session.execute(update(InterviewSession).where(InterviewSession.id == id, InterviewSession.user_id == user.id,
                              InterviewSession.revision == row.revision).values(**changes))
    if updated.rowcount != 1:
        session.rollback()
        raise HTTPException(409, 'Une autre action a modifié la séance. Recharge-la pour retrouver le résultat.')
    session.commit()
    session.expire_all()
    return public(owned(session, id, user.id))


from fastapi import File, UploadFile


@router.post('/extract-cv')
def extract_cv(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    import io
    import pdfplumber
    try:
        content = file.file.read(5 * 1024 * 1024 + 1)
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(413, 'Le CV ne doit pas dépasser 5 Mo.')
        if not content.startswith(b'%PDF-'):
            raise HTTPException(400, 'Choisis un fichier PDF contenant du texte.')
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            if len(pdf.pages) > 10:
                raise HTTPException(400, 'Choisis un CV de 10 pages maximum.')
            text = '\n\n'.join(page.extract_text() or '' for page in pdf.pages).strip()
        if not text:
            raise HTTPException(400, 'Ce PDF ne contient pas de texte lisible. Copie ton parcours dans le champ prévu.')
        if len(text) > 8000:
            raise HTTPException(400, 'Ce CV contient trop de texte. Copie les expériences pertinentes dans le champ prévu (8 000 caractères).')
        return {'text': text}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, 'Impossible de lire ce PDF. Essaie un fichier non protégé ou colle ton parcours.') from None
    finally:
        file.file.close()


class SessionSettings(BaseModel):
    profile: str = InputField('', max_length=8000)
    language: Literal['fr', 'en'] = 'fr'
    focus: Literal['mixed', 'hr', 'technical'] = 'mixed'
    question_count: Literal[5, 8] = 5
    revision: int = InputField(ge=0)


@router.patch('/{id}')
def configure(id: int, data: SessionSettings, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from sqlalchemy import update
    from datetime import datetime
    row = owned(session, id, user.id)
    if row.status != 'ready' or row.revision != data.revision:
        raise HTTPException(409, 'La séance a déjà commencé ou a changé. Recharge-la.')
    changes = data.model_dump(exclude={'revision'}) | {'revision': data.revision + 1, 'updated_at': datetime.utcnow()}
    result = session.execute(update(InterviewSession).where(InterviewSession.id == id, InterviewSession.user_id == user.id,
                             InterviewSession.revision == data.revision, InterviewSession.status == 'ready').values(**changes))
    if result.rowcount != 1:
        session.rollback()
        raise HTTPException(409, 'La séance a changé. Recharge-la.')
    session.commit()
    session.expire_all()
    return public(owned(session, id, user.id))
