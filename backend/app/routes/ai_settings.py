"""Authenticated AI preferences. Testing never sends workspace data or saves a key."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, SecretStr
from langchain_core.messages import HumanMessage
from app.api.deps import get_current_user
from app.models import User
from app.services import ai_settings as settings
from app.services.cloud_ai import stream_text, gemini_models

Provider = Literal['local', 'openai', 'gemini', 'claude']
router = APIRouter(prefix='/api/ai', tags=['Assistant IA'])


class Configuration(BaseModel):
    provider: Provider
    model: str = Field(default='', max_length=120, pattern=r'^[a-zA-Z0-9._:-]*$')
    api_key: SecretStr | None = Field(default=None, max_length=4096)
    consent: bool = False
    receipt: str = Field(default='', max_length=2048)


def resolve(user_id, data):
    if not data.consent:
        raise settings.AIError('Confirme l’envoi de données au service choisi avant de continuer.')
    if not data.model:
        raise settings.AIError('Indique le modèle à utiliser.')
    if data.model.lower() in ('gemini', 'openai', 'chatgpt', 'claude', 'ollama'):
        raise settings.AIError('Ce nom désigne le service, pas un modèle. Choisis un modèle dans la liste ou saisis son identifiant exact.')
    return request_key(user_id, data)


def request_key(user_id, data):
    supplied = data.api_key.get_secret_value().strip() if data.api_key else ''
    if supplied and any(ord(c) < 33 or ord(c) > 126 for c in supplied):
        raise settings.AIError('La clé API contient des caractères invalides.')
    return settings.credentials(user_id, data.provider, data.model, supplied)


def safe_error(error):
    return HTTPException(status_code=400, detail=str(error))


@router.get('/settings')
def read_settings(response: Response, user: User = Depends(get_current_user)):
    response.headers['Cache-Control'] = 'no-store'
    return settings.public_settings(user.id)


@router.post('/test')
def test_connection(data: Configuration, user: User = Depends(get_current_user)):
    try:
        if data.provider == 'local':
            from app.services.llm_service import get_llm_model
            get_llm_model().invoke([HumanMessage(content='Reply only OK.')])
            return {'message': 'Ollama répond correctement.', 'receipt': ''}
        key = resolve(user.id, data)
        # A tiny neutral prompt tests model access without disclosing any workspace data.
        list(stream_text(data.provider, data.model, key, [HumanMessage(content='Reply only OK.')]))
        return {'message': 'Connexion réussie. Tu peux activer ce service.', 'receipt': settings.test_receipt(user.id, data.provider, data.model, key)}
    except settings.AIError as error:
        raise safe_error(error) from None
    except Exception:
        raise HTTPException(400, 'Connexion impossible. Vérifie le service et sa configuration.') from None


@router.post('/activate')
def activate(data: Configuration, user: User = Depends(get_current_user)):
    try:
        key = resolve(user.id, data) if data.provider != 'local' else ''
        return settings.activate(user.id, data.provider, data.model, key, data.receipt)
    except settings.AIError as error:
        raise safe_error(error) from None


@router.delete('/providers/{provider}')
def delete_provider(provider: Literal['openai', 'gemini', 'claude'], user: User = Depends(get_current_user)):
    return settings.remove_credentials(user.id, provider)


@router.post('/models')
def list_models(data: Configuration, response: Response, user: User = Depends(get_current_user)):
    response.headers['Cache-Control'] = 'no-store'
    if data.provider != 'gemini':
        raise HTTPException(400, 'La liste automatique est disponible pour Gemini.')
    try:
        return {'models': gemini_models(request_key(user.id, data))}
    except settings.AIError as error:
        raise safe_error(error) from None
