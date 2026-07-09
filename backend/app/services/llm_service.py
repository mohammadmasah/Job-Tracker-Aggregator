import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama


load_dotenv()

def get_llm_model():
    model = ChatOllama(
        model = "llama3.2",
        max_tokens=None,
        timeout=None,
        max_retries=2,
        temperature = 0.7
        
    )
    return model