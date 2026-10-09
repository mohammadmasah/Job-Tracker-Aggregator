import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from app.core.ai_config import DEFAULT_MODEL


load_dotenv()

def get_llm_model(user_id=None):
    if user_id is not None:
        from app.services.ai_settings import active_credentials
        from app.services.cloud_ai import cloud_model
        selected = active_credentials(user_id)
        if selected:
            return cloud_model(*selected)

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    model = ChatOllama(
        model = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL),
        base_url=ollama_url,
        num_predict=512,
        num_ctx=8192,
        keep_alive="2m",
        client_kwargs={"timeout": 90.0},
        num_thread=min(4, os.cpu_count() or 1),
        reasoning=False,
        temperature = 0.2
        
    )
    return model
