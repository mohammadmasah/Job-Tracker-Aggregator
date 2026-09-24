import asyncio
import json
import logging
from contextlib import aclosing

from fastapi.responses import StreamingResponse
from httpx import TimeoutException

from .ai_agents import stream_chatbot_response

logger = logging.getLogger(__name__)


def streaming_chat_response(message: str, session_id: str, display_message: str | None = None):
    def event(data):
        return json.dumps(data, ensure_ascii=False) + "\n"

    async def events():
        try:
            async with asyncio.timeout(90):
                async with aclosing(stream_chatbot_response(message, session_id, display_message)) as stream:
                    async for text in stream:
                        yield event({"type": "delta", "text": text})
            yield event({"type": "done"})
        except (TimeoutError, TimeoutException):
            yield event({"type": "error", "message": "Poulpie met trop de temps à répondre. Réessaie."})
        except Exception:
            logger.exception("Chat stream failed")
            yield event({"type": "error", "message": "La réponse a été interrompue. Réessaie."})

    return StreamingResponse(
        events(), media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
