# TrackIt

**Plateforme full-stack de suivi de candidatures, enrichie par l'IA, pour piloter une recherche d'alternance ou d'emploi de bout en bout.**

TrackIt centralise vos candidatures, contacts, documents (CV) et offres d'emploi scrapées sur les principaux jobboards français, avec un assistant IA capable d'interroger votre base de données pour répondre à vos questions sur votre recherche.

---

## Sommaire

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Accès au projet](#accès-au-projet)
  - [Démo en ligne](#démo-en-ligne)
  - [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Documentation API](#documentation-api)
- [Extension Chrome](#extension-chrome)
- [Décisions d'architecture (ADR)](#décisions-darchitecture-adr)
- [Roadmap](#roadmap)
- [Contribuer](#contribuer)
- [Licence](#licence)
- [Contact](#contact)

---

## Aperçu

TrackIt est né d'un besoin concret : automatiser et structurer une recherche d'alternance en Île-de-France. Le projet couvre l'ensemble du cycle de candidature :

- **Suivi des candidatures** avec statuts, historique et relances.
- **Gestion des contacts** (recruteurs, RH) liés à chaque candidature.
- **Scraping d'offres** depuis WeLoveDevs, La Bonne Alternance et Adzuna.
- **Extension Chrome compagnon** pour enregistrer une offre en un clic depuis HelloWork, Welcome to the Jungle, JobTeaser, Indeed, WeLoveDevs, La Bonne Alternance ou LinkedIn.
- **Assistant IA (chatbot)** basé sur LangChain + Ollama, qui lit la base PostgreSQL pour donner un contexte réel sur les candidatures de l'utilisateur.
- **Analyse de CV** via un pipeline PDF dédié (extraction de texte avec `pdfplumber`).

## Fonctionnalités

| Domaine | Description |
|---|---|
| Authentification | JWT + hashing `bcrypt`/`passlib`, endpoints protégés via dépendances FastAPI |
| Candidatures | CRUD complet, statuts personnalisés, tableau de bord avec statistiques (`recharts`) |
| Contacts | Association contact ↔ candidature (table de liaison dédiée) |
| Documents | Upload et analyse de CV (endpoint `/analyse-cv/`) |
| Offres | Scraping WeLoveDevs, intégration API Adzuna, La Bonne Alternance |
| Chatbot IA | LangChain + Ollama (`llama3.2`), historique de conversation, contexte DB en temps réel |
| Notifications | Envoi d'e-mails via SMTP (relances, réinitialisation de mot de passe) |
| Performance | Cache et files via Redis, rate limiting via `slowapi` |
| Extension navigateur | Capture d'offres en un clic (Manifest V3) |

## Architecture

TrackIt suit une architecture conteneurisée en services indépendants, orchestrés par Docker Compose :

```
┌────────────────┐      ┌─────────────────┐      ┌──────────────┐
│   Frontend      │ ───► │   Backend        │ ───► │  PostgreSQL   │
│   React + Vite  │      │   FastAPI        │      │  (trackit_db) │
│   (port 3000)   │ ◄─── │   (port 8000)    │ ◄─── │  (port 5432)  │
└────────────────┘      └─────────┬────────┘      └──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼                                ▼
            ┌───────────────┐               ┌───────────────┐
            │  Redis         │               │  Ollama        │
            │  (cache/rate   │               │  (LLM local -   │
            │  limiting)     │               │  llama3.2)     │
            │  (port 6379)   │               │  (port 11434)  │
            └───────────────┘               └───────────────┘

┌──────────────────────────┐
│  Extension Chrome         │  ──► capture d'offres ──► API Backend
│  (Manifest V3)            │
└──────────────────────────┘
```

Chaque service tourne dans son propre conteneur (`trackit_db`, `trackit_redis`, `trackit_ollama`, `trackit_backend`, `trackit_frontend`), avec des volumes persistants pour la base de données et les modèles Ollama.

## Stack technique

**Backend**
- FastAPI + Uvicorn
- SQLModel / SQLAlchemy + PostgreSQL (`psycopg2-binary`)
- LangChain (`langchain-core`, `langchain-ollama`) + Ollama pour l'IA locale
- PyJWT + Passlib/Bcrypt pour l'authentification
- Redis pour le cache et le rate limiting (`slowapi`)
- `pdfplumber` / `pypdfium2` pour l'analyse de CV
- Pydantic v2 pour la validation des schémas

**Frontend**
- React 19 + Vite 8
- TailwindCSS 4
- TanStack React Query (gestion des données serveur)
- React Hook Form + Zod (formulaires et validation)
- React Router DOM 7
- Recharts (statistiques), dnd-kit (drag & drop des candidatures)
- Axios, React Markdown (rendu des réponses du chatbot)

**Infrastructure**
- Docker & Docker Compose
- PostgreSQL 15 (Alpine)
- Redis 7 (Alpine)
- Ollama (modèle local `llama3.2`)

**Extension navigateur**
- Chrome Extension Manifest V3

## Structure du projet

```
.
├── backend/
│   ├── app/
│   │   ├── api/            # Dépendances et routes utilisateur transverses
│   │   ├── core/            # Sécurité, client Redis, envoi d'e-mails
│   │   ├── models/           # Modèles SQLModel (user, offer, application, contact, document...)
│   │   ├── routes/           # Endpoints REST (applications, contacts, documents, offers, chatbot...)
│   │   ├── services/         # Logique métier (LLM, PDF, scraping WeLoveDevs, Adzuna)
│   │   ├── database.py
│   │   ├── schema.py
│   │   ├── seed.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/              # Appels API par domaine (offers, contacts, applications...)
│   │   ├── components/        # Composants réutilisables (Nav, ChatWidget, Layout...)
│   │   ├── hooks/             # Hooks personnalisés (useApplications, useStats...)
│   │   ├── pages/              # Pages (Login, Register, admin, user...)
│   │   ├── stores/             # État global
│   │   └── constants/
│   └── Dockerfile
├── job-tracker-extension/     # Extension Chrome (Manifest V3)
│   ├── manifest.json
│   ├── content.js
│   └── popup.html / popup.js
├── Docs/adr/                  # Architecture Decision Records
├── docker-compose.yml
├── setup.sh
└── start.sh
```

## Accès au projet

### Démo en ligne

> 🔜 **Lien de la démo en ligne : à venir.**
> Cette section sera mise à jour dès la mise en production d'une instance publique.

### Installation locale

**Prérequis**
- Docker et Docker Compose installés
- Ports disponibles : `3000`, `8000`, `5432`, `6379`, `11434`

**Étapes**

1. Cloner le dépôt et se placer à la racine du projet.
2. Copier le fichier d'exemple d'environnement et renseigner vos propres valeurs (voir [Variables d'environnement](#variables-denvironnement)) :
   ```bash
   cp .env.example .env
   ```
3. Lancer l'ensemble des services :
   ```bash
   docker compose up --build
   ```
4. Accéder aux services :
   - Frontend : http://localhost:3000
   - Backend / API docs (Swagger) : http://localhost:8000/docs
   - Ollama : http://localhost:11434

5. (Optionnel) Charger l'extension Chrome en mode développeur : `chrome://extensions` → *Mode développeur* → *Charger l'extension non empaquetée* → sélectionner le dossier `job-tracker-extension/`.

> ⚠️ Le premier démarrage du conteneur `ollama` peut nécessiter le téléchargement du modèle `llama3.2` (`docker exec -it trackit_ollama ollama pull llama3.2`).

## Variables d'environnement

### Mac Apple Silicon : accélération GPU du chatbot

Exécuter Ollama directement sur macOS pour utiliser Metal. Le conteneur
Ollama utilise le CPU sur cette configuration et peut prendre plusieurs minutes.

```bash
brew install ollama
docker compose stop ollama
brew services start ollama
ollama pull llama3.2
docker compose -f docker-compose.yml -f compose.macos.yaml up -d --build
```

Utiliser les deux fichiers Compose pour les prochains démarrages sur Mac.
Le backend rejoint Ollama via `host.docker.internal:11434` ; les autres
services restent dans Docker. Après un message, `ollama ps` doit afficher
`100% GPU`. Le premier message peut prendre plus de temps pour charger le modèle.


Créer un fichier `.env` à la racine du backend à partir de l'exemple ci-dessous. **Ne jamais committer de vraies valeurs.**

```env
# Scraping / offres
WELOVEDEVS_API_KEY=
WELOVEDEVS_URL=

# Envoi d'e-mails (notifications, réinitialisation de mot de passe)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@example.com
SENDER_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3000

# Base de données (définie automatiquement par docker-compose)
DATABASE_URL=postgresql://trackit_user:trackit_password@db:5432/trackit_db

# Ollama / Redis (définis automatiquement par docker-compose)
OLLAMA_BASE_URL=http://ollama:11434
REDIS_HOST=redis
REDIS_PORT=6379
```

## Documentation API

L'API FastAPI expose une documentation interactive générée automatiquement :

- **Swagger UI** : `/docs`
- **ReDoc** : `/redoc`

Principaux domaines d'endpoints : `auth`/`user`, `applications`, `contacts`, `contact-method`, `documents` (upload + `/analyse-cv/`), `offers`, `scraper` (WeLoveDevs), `adzuna`, `chatbot` (LangChain + Ollama).

## Extension Chrome

L'extension `job-tracker-extension/` (Manifest V3) permet d'enregistrer une offre d'emploi en un clic directement depuis :

HelloWork, Welcome to the Jungle, JobTeaser, Indeed, WeLoveDevs, La Bonne Alternance et LinkedIn Jobs.

Elle injecte un content script sur ces sites et communique avec l'API backend pour créer automatiquement une candidature dans le dashboard.

## Décisions d'architecture (ADR)

Les choix techniques majeurs sont documentés et justifiés dans `Docs/adr/` :

| ADR | Sujet |
|---|---|
| 001 | Choix de l'IA : LangChain + Ollama |
| 002 | Choix de la base de données : PostgreSQL |
| 003 | Choix de Redis (performance et cache) |
| 004 | Choix de sécurité |
| 005 | Choix de l'architecture Docker |
| 006 | Choix de l'architecture de l'extension Chrome |
