# ADR 0005 : Architecture Multi-Conteneurs Docker Compose et Isolation Réseau

* **Statut :** Accepté
* **Date :** 2026-08-02
* **Auteurs :** Mohammad Masah (Équipe TrackIT)

---

## 1. Contexte (Contexte)
Le projet TrackIT est composé de plusieurs briques technologiques distinctes : une interface utilisateur React (Vite), un backend FastAPI, un SGBD PostgreSQL, un store en mémoire Redis et un moteur d'inférence IA local Ollama.

Pour garantir la reproductibilité de l'environnement de développement et de production, la sécurité par isolation des services et la simplicité de déploiement, nous avions besoin d'une stratégie d'orchestration légère et autonome.

---

## 2. Choix de l'Architecture (Décision)

### 1. Découpage en 5 Conteneurs Indépendants
Nous avons structuré l'infrastructure micro-services autour de **5 conteneurs Docker Compose** :

1. **`trackit_frontend` (React + Vite) :** Héberge l'interface utilisateur web et communique avec le backend via les API REST.
2. **`trackit_backend` (FastAPI / Python) :** Contient la logique métier, l'authentification JWT, l'orchestration LangChain et les routes d'API.
3. **`trackit_db` (PostgreSQL 15) :** Assure la persistance des données relationnelles (utilisateurs, candidatures) et des embeddings vectoriels.
4. **`trackit_redis` (Redis 7) :** Gère le cache, les compteurs de tentatives d'authentification et le rate-limiting.
5. **`trackit_ollama` (Ollama + Llama 3.2 3B) :** Exécute le modèle de langage localement sans aucune dépendance cloud.

### 2. Isolation Réseau et Communication Inter-Services (Bridge Network)
- **Réseau Interne Dédié (`trackit_net`) :** Tous les conteneurs sont rattachés à un réseau bridge personnalisé.
- **Sécurité & Masquage des Ports :** Seuls le Frontend (ex: Port `5173`) et le Backend (Port `8000`) exposent leurs ports vers la machine hôte (`localhost`). La base de données PostgreSQL (`5432`), Redis (`6379`) et Ollama (`11434`) ne sont accessibles **qu'à l'intérieur du réseau Docker**, empêchant toute attaque directe depuis l'extérieur.
- **Résolution DNS Interne Docker :** Les services communiquent entre eux en utilisant le nom du service comme nom de domaine (ex: `http://ollama:11434` ou `postgresql://db:5432/trackit`).

### 3. Gestion de la Dépendance et Santé des Services (Healthchecks)
- Pour éviter que le Backend FastAPI ne démarre avant que PostgreSQL ou Redis ne soient prêts à recevoir des connexions, nous utilisons la clause `depends_on` couplée aux **`healthcheck`** Docker :
  - Le conteneur `trackit_backend` attend que `trackit_db` passe en état `healthy` (via `pg_isready`).

---

## 3. Conséquences et Compromis (Conséquences & Tradeoffs)

### Conséquences Positives (Benefits) :
- **Reproductibilité Totale :** Une simple commande `docker compose up -d` lance l'intégralité du stack applicatif sur n'importe quel système (macOS M4, Linux, Windows) de manière identique.
- **Sécurité et Surface d'Attaque Réduite :** L'isolation réseau garantit que la BDD et Redis ne sont pas exposés sur Internet ou sur le réseau local.
- **Persistance des Données :** Utilisation de volumes Docker nommés (`postgres_data`, `redis_data`, `ollama_storage`) pour conserver l'état de l'application même en cas de suppression des conteneurs.

### Preuves d'implémentation (How) :
- **Fichier de Configuration :** Ensemble des 5 services, réseaux et volumes définis dans `docker-compose.yml` à la racine du projet.
- **Variables d'environnement :** Connexion inter-conteneurs orchestrée via les variables dans le fichier `.env`.

---

## 4. Alternatives Rejetées (Rejected Alternatives) & Limitations

### Alternatives Rejetées :
1. **Architecture Monolithique (Tout exécuter en local sans Docker) :**  
   Rejetée en raison des conflits de versions de dépendances (Python, Node.js, PostgreSQL) selon les machines des développeurs et de la complexité d'installation d'Ollama/Redis.

### Limitations observées (Tradeoffs & Métriques) :
- **Consommation de Ressources Système :** L'exécution simultanée des 5 conteneurs (notamment avec l'inférence locale d'Ollama) mobilise une quantité significative de RAM (~3-4 Go) et génère des pics de CPU au chargement.