"""Server-only credential storage and short-lived proof of a successful connection test."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import threading
from cryptography.fernet import Fernet, InvalidToken
from sqlmodel import Session, select
from app.database import engine
from app.models.ai_setting import AISelection, AIProvider
from app.core.ai_config import DEFAULT_MODEL

PROVIDERS = {'openai': 'OpenAI', 'gemini': 'Gemini', 'claude': 'Claude'}
_lock = threading.Lock()


class AIError(Exception):
    """Only safe, user-facing messages may be put in this exception."""


def cipher():
    directory = Path(os.getenv('TRACKIT_AI_KEY_DIR') or os.getenv('TRACKIT_DATA_DIR') or Path(__file__).resolve().parents[2] / '.private')
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / 'ai-credentials.key'
    with _lock:
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(Fernet.generate_key())
        key = path.read_bytes()
    return Fernet(key)


def protect(user_id, provider, key):
    return cipher().encrypt(json.dumps([user_id, provider, key]).encode()).decode()


def reveal(row):
    try:
        user_id, provider, key = json.loads(cipher().decrypt(row.encrypted_key.encode()))
        if (user_id, provider) != (row.user_id, row.provider):
            raise ValueError()
        return key
    except (InvalidToken, ValueError, OSError):
        raise AIError('Impossible de lire la clé enregistrée. Saisis-la à nouveau dans Assistant IA.') from None


def public_settings(user_id):
    with Session(engine) as session:
        active = session.get(AISelection, user_id)
        rows = session.exec(select(AIProvider).where(AIProvider.user_id == user_id)).all()
        provider = active.provider if active else 'local'
        profiles = {row.provider: {'model': row.model, 'has_key': True} for row in rows}
    return {'provider': provider, 'model': os.getenv('OLLAMA_MODEL', DEFAULT_MODEL) if provider == 'local' else profiles.get(provider, {}).get('model', ''), 'profiles': profiles}


def credentials(user_id, provider, model, api_key):
    if api_key:
        return api_key
    with Session(engine) as session:
        row = session.get(AIProvider, (user_id, provider))
        if row:
            return reveal(row)
    raise AIError('Ajoute une clé API pour ce service.')


def signature(user_id, provider, model, key):
    return hashlib.sha256(json.dumps([user_id, provider, model, key]).encode()).hexdigest()


def test_receipt(user_id, provider, model, key):
    return cipher().encrypt(signature(user_id, provider, model, key).encode()).decode()


def activate(user_id, provider, model='', key='', receipt=''):
    if provider != 'local':
        try:
            tested = cipher().decrypt(receipt.encode(), ttl=600).decode()
            if not hmac.compare_digest(tested, signature(user_id, provider, model, key)):
                raise ValueError()
        except (InvalidToken, ValueError):
            raise AIError('Teste cette configuration avant de l’activer (test valable 10 minutes).') from None
    with Session(engine) as session:
        if provider != 'local':
            session.merge(AIProvider(user_id=user_id, provider=provider, model=model, encrypted_key=protect(user_id, provider, key)))
        session.merge(AISelection(user_id=user_id, provider=provider))
        session.commit()
    return public_settings(user_id)


def active_credentials(user_id):
    with Session(engine) as session:
        selection = session.get(AISelection, user_id)
        if not selection or selection.provider == 'local':
            return None
        row = session.get(AIProvider, (user_id, selection.provider))
        if not row:
            raise AIError('Configure à nouveau le service sélectionné dans Assistant IA.')
        return row.provider, row.model, reveal(row)


def remove_credentials(user_id, provider):
    with Session(engine) as session:
        row = session.get(AIProvider, (user_id, provider))
        if row:
            session.delete(row)
        active = session.get(AISelection, user_id)
        if active and active.provider == provider:
            active.provider = 'local'
            session.add(active)
        session.commit()
    return public_settings(user_id)
