# Installation du projet

## Prérequis
- Python 3.10+
- Node.js 18+
- (Optionnel, pour le chatbot) Ollama : https://ollama.com

## Installation
```bash
./setup.sh
```
Ce script crée le venv Python, installe les dépendances backend (`requirements.txt`)
et frontend (`npm install`).

## Lancement
```bash
./start.sh
```
Démarre le backend (port 8000) et le frontend (port 3000). Ctrl+C arrête les deux.

Ou manuellement, dans deux terminaux :
```bash
# Terminal 1
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

## Chatbot (Ollama)
Le chatbot nécessite Ollama en local :
```bash
ollama serve
ollama pull llama3.2
```