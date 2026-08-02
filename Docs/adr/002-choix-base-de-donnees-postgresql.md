# ADR 0002 : Choix du Système de Gestion de Base de Données – PostgreSQL

* **Statut :** Accepté
* **Date :** 2026-08-02
* **Auteurs :** Mohammad Masah (Équipe TrackIT)

---

## 1. Contexte (Contexte)
Le projet TrackIT nécessite un système de gestion de base de données (SGBD) capable d'assurer la persistance des candidatures, des offres d'emploi capturées, des profils utilisateurs et des historiques d'interaction.

Dans une architecture multi-conteneurs distribuée via Docker Compose, nous avions besoin d'un SGBD capable de :
1. Gérer des **relations complexes et structurées** (utilisateurs, candidatures, contacts, offres).
2. Supporter les **accès concurrents** (provenant simultanément de l'application Web React, de l'extension Chrome et des tâches de fond du Backend FastAPI).
3. Garantir l'**intégrité des données (ACID)** et une parfaite intégration avec notre ORM Python (**SQLModel / SQLAlchemy**).

---

## 2. Choix de PostgreSQL (Décision)

### Pourquoi PostgreSQL plutôt que SQLite, MongoDB ou une VectorDB séparée (Why) ?
Nous avons sélectionné **PostgreSQL 15** hébergé dans le conteneur `trackit_db` pour quatre raisons majeures :

1. **Architecture Unifiée et Synchronisation en Production :** 
   En déployant l'application sur serveur, l'utilisation d'un SGBD unique garantit une **source unique de vérité (Single Source of Truth)**. Cela évite les problèmes complexes de synchronisation de données entre plusieurs bases de données distinctes face à un volume élevé de candidatures et de fichiers.
2. **Support des Vector Embeddings via l'extension `pgvector` (IA & Chatbot) :** 
   Pour permettre au Chatbot d'analyser et de rechercher efficacement dans les documents PDF (CV, fiches de poste), PostgreSQL permet d'activer simplement l'extension **`pgvector`**. Cela nous évite d'ajouter un conteneur supplémentaire dédié aux bases vectorielles (ex: ChromaDB ou Qdrant), réduisant ainsi la complexité de l'infrastructure Docker Compose.
3. **Gestion de la concurrence et verrous (MVCC) :** 
   PostgreSQL gère le contrôle de concurrence multiversion. L'extension Chrome peut enregistrer une offre pendant que l'utilisateur consulte son tableau de bord sans verrouiller la base de données (contrairement à SQLite).
4. **Support des types JSON/JSONB :** 
   Permet de stocker la structure flexible des métadonnées des offres tout en conservant la rigueur d'un modèle relationnel avec SQLModel/FastAPI.

### Comment est-il implémenté (How) ?
Dans notre architecture Docker et notre code Backend :
- **Conteneur Docker dédié :** Image officielle `postgres:15-alpine` tournant sur le conteneur `trackit_db` (Port `5432`), isolée dans le réseau Docker interne.
- **ORM & Connection Pooling :** Gestion des sessions dans `backend/app/database.py` via SQLModel.

---

## 3. Conséquences et Compromis (Conséquences & Tradeoffs)

### Conséquences Positives (Benefits) :
- **Intégrité stricte des données (ACID) :** Garantit la cohérence des identifiants et clés étrangères entre les utilisateurs et leurs candidatures.
- **Persistance garantie :** Utilisation de volumes Docker nommés (`postgres_data`) pour éviter toute perte de données lors du redémarrage des conteneurs.
- **Scalabilité :** Préparé pour une montée en charge si l'application est déployée en environnement de production réel.

### Preuves d'implémentation (How) :
- **Infrastructure :** Service `db` défini dans `docker-compose.yml` avec la vérification de santé (`healthcheck`).
- **Configuration Backend :** Connexion via la variable d'environnement `DATABASE_URL=postgresql://user:password@db:5432/trackit`.

---

## 4. Alternatives Rejetées & Simplification d'Architecture

### Alternatives Rejetées :
1. **Architecture Multi-Bases (PostgreSQL + VectorDB dédiée comme ChromaDB/Qdrant) :** 
   Rejetée pour des raisons de simplicité d'infrastructure. L'utilisation de l'extension `pgvector` sur PostgreSQL offre des performances de recherche vectorielle largement suffisantes pour notre volume de documents PDF tout en maintenant la cohérence transactionnelle.
2. **SQLite :** Rejeté en raison des blocages lors des accès concurrents (Extension Chrome + App Web).
3. **MongoDB :** Rejeté car les données sont fondamentalement relationnelles.

### Limitations observées (Tradeoffs & Métriques) :
- **Empreinte mémoire initiale :** PostgreSQL consomme plus de ressources système au démarrage (~30-50 Mo de RAM) comparativement à un simple fichier SQLite.
- **Complexité de configuration :** Nécessite la configuration de variables d'environnement, de politiques de volumes et de scripts d'initialisation dans Docker.