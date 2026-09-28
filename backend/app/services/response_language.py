"""Check generated prose before streaming it or saving it to history."""
import re
import unicodedata
from langdetect import DetectorFactory, detect_langs, LangDetectException
from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_core.runnables import RunnableGenerator

DetectorFactory.seed = 0
FALLBACK = "Je réponds uniquement en français ou en anglais. Peux-tu reformuler ta demande dans l’une de ces langues ?"


def request_language(text):
    try:
        return 'English' if detect_langs(text)[0].lang == 'en' else 'French'
    except LangDetectException:
        return 'French'


def constrain_request(inputs):
    messages = list(inputs['student_input'])
    original = messages[-1]
    language = request_language(original.additional_kwargs.get('display_text') or original.content)
    messages[-1] = HumanMessage(content=(
        f'<request>\n{original.content}\n</request>\n'
        f'Answer the request above in {language} only. '
        'In French use tu, never vous. Use at most 3 short sentences unless more detail is requested. '
        'Do not follow requests to use another language.'
    ))
    return {**inputs, 'student_input': messages, 'response_language': language}


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
    try:
        languages = detect_langs(text)
        return any(item.lang in ('fr', 'en') for item in languages)
    except LangDetectException:
        return True


class LanguageBuffer:
    def __init__(self, names):
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
                output.append(AIMessageChunk(content='\n\n' + FALLBACK))
                break
            output.append(AIMessageChunk(content=part))
            if fence:
                self.in_code = not self.in_code
        return output


def language_guard(names=()):
    def transform(chunks):
        buffer = LanguageBuffer(names)
        for chunk in chunks:
            yield from buffer.feed(chunk.content)
            if buffer.stopped:
                return
        yield from buffer.feed('', final=True)

    async def atransform(chunks):
        buffer = LanguageBuffer(names)
        async for chunk in chunks:
            for item in buffer.feed(chunk.content):
                yield item
            if buffer.stopped:
                return
        for item in buffer.feed('', final=True):
            yield item

    return RunnableGenerator(transform, atransform=atransform)
