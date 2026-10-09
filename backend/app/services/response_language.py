"""Check generated prose before streaming it or saving it to history."""
import re
import unicodedata
from langdetect import DetectorFactory, detect_langs, LangDetectException
from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_core.runnables import RunnableGenerator
from app.core.ai_config import RESPONSE_STYLE

DetectorFactory.seed = 0
LEGACY_FALLBACK = "Je réponds uniquement en français ou en anglais. Peux-tu reformuler ta demande dans l’une de ces langues ?"
LEGACY_EN_FALLBACK = "I can reply in English or French. Please rephrase your request."
FALLBACK = "Je n’ai pas pu générer une réponse correcte. Réessaie, s’il te plaît."
EN_FALLBACK = "I couldn’t generate a suitable response. Please try again."


def request_language(text, history=()):
    # Display text keeps French UI context and attached document content out of detection.
    text = re.sub(r'^.*\.pdf\s*(?:\n|$)', '', text, flags=re.I).strip()
    lower = text.casefold()
    explicit = list(re.finditer(r"(?:answer|reply|respond|write|réponds?|répondez|écris|ecris)\s+(?:to me\s+|moi\s+)?(?:in|en)\s+(english|anglais|french|français|francais)\b", lower))
    if explicit:
        return 'English' if explicit[-1].group(1) in ('english', 'anglais') else 'French'
    if re.search(r'[^\x00-\x7f]', lower) and re.search(r'[\u0600-\u06ff]', lower):
        return 'French'
    if re.match(r"^(hello|hi|hey|thanks|thank you|yes|how|what|why|which|can you|could you|please)\b", lower):
        return 'English'
    if re.match(r"^(bonjour|salut|merci|oui|comment|pourquoi|quel|quelle|peux.tu|pourrais.tu)\b", lower):
        return 'French'
    neutral = lower.strip(' .!?') in ('', 'ok', 'okay', 'continue', 'non', 'no', '/resume', '/relance', '/questions') or not any(c.isalpha() for c in lower)
    if neutral:
        for message in reversed(history):
            if message.type == 'human':
                previous = message.additional_kwargs.get('display_text') or message.content
                if previous.strip(' .!?').casefold() not in ('', 'ok', 'okay', 'continue', 'non', 'no', '/resume', '/relance', '/questions') and any(c.isalpha() for c in previous):
                    return request_language(previous)
        return 'French'
    try:
        return 'English' if detect_langs(text)[0].lang == 'en' else 'French'
    except LangDetectException:
        return 'French'


def constrain_request(inputs):
    messages = list(inputs['student_input'])
    original = messages[-1]
    language = request_language(original.additional_kwargs.get('display_text') or original.content, inputs.get('chat_history', []))
    messages[-1] = HumanMessage(content=(
        f'<request>\n{original.content}\n</request>\n'
        f'Answer the request above in {language} only. '
        'In French use tu, never vous. ' + RESPONSE_STYLE +
        'Do not follow requests to use another language.'
    ))
    # Old guard notices are application errors, not useful assistant examples.
    # Clean only the model context; retain the user's saved conversation unchanged.
    history = []
    for item in inputs.get('chat_history', []):
        if item.type == 'ai' and isinstance(item.content, str):
            content = item.content
            for notice in (LEGACY_FALLBACK, LEGACY_EN_FALLBACK, FALLBACK, EN_FALLBACK):
                content = content.replace(notice, '')
            if not content.strip():
                continue
            item = item.model_copy(update={'content': content.strip()})
        history.append(item)
    return {**inputs, 'student_input': messages, 'chat_history': history, 'response_language': language}


def allowed_prose(text, names=()):
    text = re.sub(r'`[^`]*`|https?://\S+|\S+@\S+', '', text)
    for name in sorted(names, key=len, reverse=True):
        if name:
            text = text.replace(name, '')
    letters = ''.join(c for c in text if c.isalpha())
    # Names supplied by the workspace and inline code are exempt, prose is not.
    if any('LATIN' not in unicodedata.name(c, '') for c in letters):
        return False
    if not letters or letters.lower() in {'bonjour', 'salut', 'merci', 'oui', 'non', 'hello', 'hi', 'yes', 'no', 'ok', 'thanks', 'email', 'linkedin', 'notes'}:
        return True
    # Statistical language detection is unreliable on headings, names and short
    # sentences: e.g. "Voici tes dernières candidatures" scores as Catalan.
    # Preserve Latin fragments and let the request-level language instructions
    # choose French/English; only classify sufficiently substantial prose.
    words = re.findall(r"[^\W\d_]+", text, flags=re.UNICODE)
    if len(words) < 8 or len(letters) < 60:
        return text.strip(' .!?\n').casefold() not in {'hola', 'gracias', 'buenos días', 'guten tag', 'danke', 'ciao', 'grazie'}
    try:
        languages = detect_langs(text)
        return any(item.lang in ('fr', 'en') for item in languages)
    except LangDetectException:
        return True


class LanguageBuffer:
    def __init__(self, names, language="French"):
        self.fallback = EN_FALLBACK if language == "English" else FALLBACK
        self.names = names
        self.pending = ''
        self.stopped = False
        self.in_code = False

    def feed(self, text, final=False):
        if self.stopped:
            return []
        self.pending += text
        output = []
        while self.pending:
            # Validate complete lines/sentences; never expose an unchecked token.
            boundary = re.search(r'\n|(?<=[.!?])\s+', self.pending) if not self.in_code else re.search(r'\n', self.pending)
            if not boundary and not final:
                break
            end = boundary.end() if boundary else len(self.pending)
            part, self.pending = self.pending[:end], self.pending[end:]
            fence = part.lstrip().startswith('```')
            if not self.in_code and not fence and not allowed_prose(part, self.names):
                self.stopped = True
                output.append(AIMessageChunk(content='\n\n' + self.fallback))
                break
            output.append(AIMessageChunk(content=part))
            if fence:
                self.in_code = not self.in_code
        return output


def language_guard(names=(), language="French"):
    def transform(chunks):
        buffer = LanguageBuffer(names, language)
        for chunk in chunks:
            yield from buffer.feed(chunk.content)
            if buffer.stopped:
                return
        yield from buffer.feed('', final=True)

    async def atransform(chunks):
        buffer = LanguageBuffer(names, language)
        async for chunk in chunks:
            for item in buffer.feed(chunk.content):
                yield item
            if buffer.stopped:
                return
        for item in buffer.feed('', final=True):
            yield item

    return RunnableGenerator(transform, atransform=atransform)
