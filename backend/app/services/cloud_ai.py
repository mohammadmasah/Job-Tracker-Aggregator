"""Small text-only streaming adapters for the providers' official HTTPS APIs.

Secrets live in request headers, never URLs, runnable metadata or error messages.
"""
import json
import httpx
from langchain_core.messages import AIMessageChunk
from langchain_core.runnables import RunnableGenerator
from app.services.ai_settings import AIError


def request_spec(provider, model, key, messages):
    system = '\n'.join(str(m.content) for m in messages if m.type == 'system')
    turns = [{'role': 'assistant' if m.type == 'ai' else 'user', 'content': str(m.content)} for m in messages if m.type in ('human', 'ai')]
    if provider == 'openai':
        return 'https://api.openai.com/v1/responses', {'Authorization': f'Bearer {key}'}, {
            'model': model, 'instructions': system, 'input': turns, 'stream': True, 'store': False, 'max_output_tokens': 2048,
        }
    if provider == 'claude':
        return 'https://api.anthropic.com/v1/messages', {'x-api-key': key, 'anthropic-version': '2023-06-01'}, {
            'model': model, 'system': system, 'messages': turns, 'stream': True, 'max_tokens': 2048,
        }
    if provider == 'gemini':
        return f'https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse', {'x-goog-api-key': key}, {
            'systemInstruction': {'parts': [{'text': system}]},
            'contents': [{'role': 'model' if t['role'] == 'assistant' else 'user', 'parts': [{'text': t['content']}]} for t in turns],
            'generationConfig': {'maxOutputTokens': 2048},
        }
    raise AIError('Service IA inconnu.')


def check_status(status):
    if status < 400:
        return
    if status in (401, 403):
        raise AIError('Clé API invalide ou accès refusé. Vérifie la clé et les autorisations du modèle.')
    if status == 429:
        raise AIError('Quota ou limite de requêtes atteint. Vérifie ton crédit API ou réessaie plus tard.')
    if status in (400, 404):
        raise AIError('Modèle indisponible ou configuration incompatible. Vérifie son identifiant et ton accès API.')
    raise AIError('Le service IA est indisponible. Réessaie plus tard ou choisis Ollama dans Assistant IA.')


class Events:
    def __init__(self, provider):
        self.provider = provider
        self.done = False
        self.text = False

    def parse(self, data):
        if data == '[DONE]':
            self.done = True
            return ''
        try:
            event = json.loads(data)
        except ValueError:
            raise AIError('Réponse du service IA illisible. Réessaie.') from None
        kind = event.get('type')
        if event.get('error') or kind in ('error', 'response.failed', 'response.incomplete'):
            raise AIError('Le service IA a interrompu la réponse. Vérifie ton quota et réessaie.')
        text = ''
        if self.provider == 'openai':
            if kind == 'response.output_text.delta':
                text = event.get('delta', '')
            if kind == 'response.completed':
                self.done = True
        elif self.provider == 'claude':
            if kind == 'content_block_delta' and event.get('delta', {}).get('type') == 'text_delta':
                text = event['delta'].get('text', '')
            if kind == 'message_stop':
                self.done = True
        else:
            candidates = event.get('candidates', [])
            if event.get('promptFeedback', {}).get('blockReason'):
                raise AIError('Le service IA a refusé cette demande. Reformule-la.')
            if candidates:
                candidate = candidates[0]
                text = ''.join(p.get('text', '') for p in candidate.get('content', {}).get('parts', []) if not p.get('thought'))
                if candidate.get('finishReason'):
                    self.done = True
                    if candidate['finishReason'] not in ('STOP', 'MAX_TOKENS'):
                        raise AIError('Le service IA a interrompu cette demande. Reformule-la.')
        self.text |= bool(text)
        return text

    def finish(self):
        if not self.done or not self.text:
            raise AIError('Réponse vide ou connexion interrompue. Réessaie sans changer de service.')


def sse_data(lines):
    parts = []
    for line in lines:
        if not line:
            if parts:
                yield '\n'.join(parts)
                parts = []
        elif line.startswith('data:'):
            parts.append(line[5:].lstrip())
    if parts:
        yield '\n'.join(parts)


def stream_text(provider, model, key, messages):
    url, headers, payload = request_spec(provider, model, key, messages)
    events = Events(provider)
    try:
        with httpx.Client(timeout=60, follow_redirects=False) as client:
            with client.stream('POST', url, headers=headers, json=payload) as response:
                check_status(response.status_code)
                for data in sse_data(response.iter_lines()):
                    text = events.parse(data)
                    if text:
                        yield text
        events.finish()
    except httpx.TimeoutException:
        raise AIError('Le service IA met trop de temps à répondre. Réessaie.') from None
    except httpx.HTTPError:
        raise AIError('Connexion au service IA impossible. Vérifie ta connexion Internet.') from None


async def astream_text(provider, model, key, messages):
    url, headers, payload = request_spec(provider, model, key, messages)
    events = Events(provider)
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=False) as client:
            async with client.stream('POST', url, headers=headers, json=payload) as response:
                check_status(response.status_code)
                parts = []
                async for line in response.aiter_lines():
                    if not line and parts:
                        text = events.parse('\n'.join(parts))
                        parts = []
                        if text:
                            yield text
                    elif line.startswith('data:'):
                        parts.append(line[5:].lstrip())
                if parts:
                    text = events.parse('\n'.join(parts))
                    if text:
                        yield text
        events.finish()
    except httpx.TimeoutException:
        raise AIError('Le service IA met trop de temps à répondre. Réessaie.') from None
    except httpx.HTTPError:
        raise AIError('Connexion au service IA impossible. Vérifie ta connexion Internet.') from None


def cloud_model(provider, model, key):
    def transform(inputs):
        for prompt in inputs:
            for text in stream_text(provider, model, key, prompt.to_messages()):
                yield AIMessageChunk(content=text)

    async def atransform(inputs):
        async for prompt in inputs:
            async for text in astream_text(provider, model, key, prompt.to_messages()):
                yield AIMessageChunk(content=text)

    return RunnableGenerator(transform, atransform=atransform)


def gemini_models(key):
    """Discover generation models without sending prompts or persisting the API key."""
    import re
    models = {}
    token = None
    try:
        with httpx.Client(timeout=20, follow_redirects=False) as client:
            for _ in range(5):
                params = {'pageSize': 1000}
                if token:
                    params['pageToken'] = token
                response = client.get('https://generativelanguage.googleapis.com/v1beta/models',
                                      headers={'x-goog-api-key': key}, params=params)
                check_status(response.status_code)
                data = response.json()
                for item in data.get('models', []):
                    name = item.get('name', '').removeprefix('models/')
                    if 'generateContent' in item.get('supportedGenerationMethods', []) and re.fullmatch(r'[a-zA-Z0-9._:-]{1,120}', name):
                        models[name] = {'id': name, 'name': item.get('displayName') or name}
                token = data.get('nextPageToken')
                if not token:
                    break
            else:
                raise AIError('La liste est trop longue. Réessaie ou saisis l’identifiant exact du modèle.')
        if not models:
            raise AIError('Aucun modèle de génération disponible. Vérifie ton accès Gemini API.')
        return sorted(models.values(), key=lambda model: model['id'])
    except (httpx.HTTPError, ValueError):
        raise AIError('Impossible de charger les modèles Gemini. Vérifie ta connexion et réessaie.') from None
