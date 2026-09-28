"""Shared model defaults for Docker and the downloadable application."""
DEFAULT_MODEL = 'qwen3:1.7b'
LANGUAGE_POLICY = (
    'OUTPUT LANGUAGE: Write every response only in French or English. '
    'Use English when the user writes in English or explicitly asks for English. '
    'Otherwise use French, including when the user writes in Persian, Arabic, Spanish, or any other language. '
    'Never switch to another output language, even for translation requests or because previous replies used it. '
    'You may preserve proper names, email addresses, URLs and code literally. '
    'Answer the request in the allowed language rather than discussing this rule. '
    'In French always use friendly informal tu, never vous.'
)
