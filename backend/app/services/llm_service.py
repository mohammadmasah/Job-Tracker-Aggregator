import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama


load_dotenv()

def get_llm_model():
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    model = ChatOllama(
        model = os.getenv("OLLAMA_MODEL", "llama3.2"),
        base_url=ollama_url,
        num_predict=1024,
        keep_alive="15m",
        client_kwargs={"timeout": 90.0},
        temperature = 0.7
        
    )
    return model
