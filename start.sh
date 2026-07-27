#!/usr/bin/env bash
# ============================================================
#  Job-tracker — Lancement backend + frontend
#  Usage : ./start.sh
# ============================================================

set -e

GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}==>${NC} $1"; }

# Arrête les deux serveurs proprement quand on fait Ctrl+C
cleanup() {
    info "Arrêt des serveurs..."
    kill 0
    exit 0
}
trap cleanup SIGINT SIGTERM

# --- Backend ---
info "Démarrage du backend (port 8000)..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 --env-file .env &
cd ..

# --- Frontend ---
info "Démarrage du frontend (port 3000)..."
cd frontend
npm run dev &
cd ..

info "Backend : http://localhost:8000/docs"
info "Frontend : http://localhost:3000"
info "Ctrl+C pour tout arrêter."

# Attend que les process se terminent
wait
