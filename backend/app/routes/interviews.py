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
