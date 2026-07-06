#!/usr/bin/env bash
# ============================================================
#  Job-tracker — Installation des dépendances
#  Usage : ./setup.sh
# ============================================================

set -e  # arrête le script à la première erreur

# Couleurs pour la lisibilité
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # no color

info()  { echo -e "${GREEN}==>${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# --- Vérification des prérequis ---
info "Vérification des prérequis..."

if ! command -v python3 &> /dev/null; then
    error "python3 n'est pas installé. Installe-le avant de continuer."
    exit 1
fi

if ! command -v node &> /dev/null; then
    error "node n'est pas installé. Installe Node.js avant de continuer."
    exit 1
fi

info "python3 $(python3 --version 2>&1 | cut -d' ' -f2) et node $(node --version) détectés."

# ============================================================
#  BACKEND
# ============================================================
info "Installation du backend..."
cd backend

# Crée le venv s'il n'existe pas
if [ ! -d "venv" ]; then
    info "Création de l'environnement virtuel Python..."
    python3 -m venv venv
else
    warn "venv déjà présent, on le réutilise."
fi

# Active le venv et installe
source venv/bin/activate
info "Installation des dépendances Python (requirements.txt)..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
info "Backend prêt."

# Crée un .env par défaut s'il manque
if [ ! -f "app/.env" ] && [ ! -f ".env" ]; then
    warn "Aucun fichier .env trouvé — pense à le créer si le projet en a besoin."
fi

deactivate
cd ..

# ============================================================
#  FRONTEND
# ============================================================
info "Installation du frontend..."
cd frontend

info "Installation des dépendances npm..."
npm install --silent
info "Frontend prêt."

cd ..

# ============================================================
#  FIN
# ============================================================
echo ""
info "Installation terminée ! 🎉"
echo ""
echo "Pour lancer le projet, ouvre DEUX terminaux :"
echo ""
echo "  Terminal 1 (backend) :"
echo "    cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (frontend) :"
echo "    cd frontend && npm run dev"
echo ""
echo "  Le chatbot nécessite Ollama :"
echo "    ollama serve   (puis: ollama pull llama3.2)"
echo ""
