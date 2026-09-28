import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from app.core.ai_config import DEFAULT_MODEL


load_dotenv()

def get_llm_model():
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
