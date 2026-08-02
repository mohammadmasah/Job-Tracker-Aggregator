# ADR 003 : Utilisation de Redis pour la Gestion du Cache, des Données Volatiles et du Rate Limiting

* **Statut :** Accepté
* **Date :** 2026-08-02
* **Auteurs :** Mohammad Masah (Équipe TrackIT)

---

## 1. Contexte (Contexte)
L'architecture de TrackIT repose sur plusieurs services interagissant simultanément (Frontend React, Extension Chrome, Backend FastAPI et API tierces). Pour garantir une fluidité maximale et des temps de réponse ultra-rapides, nous avions besoin d'un système capable de :
1. **Gérer le Rate Limiting des API externes :** Respecter les contraintes de débit imposées par les services tiers (ex: WeLoveDevs, Adzuna) en évitant le sur-appel de requêtes (ex: maximum 1 req/sec).
2. **Stocke des données éphémères à haute fréquence :** Manipuler des états temporaires et des jetons à durée de vie limitée (TTL) sans solliciter la base de données relationnelle.
3. **Mettre en cache des requêtes récurrentes :** Accélérer la lecture des données fréquemment consultées par l'interface utilisateur.

---

## 2. Choix de Redis (Décision)

### Pourquoi Redis pour les performances et le cache (Why) ?
Nous avons intégré **Redis 7** (In-Memory Data Store) dans le conteneur `trackit_redis` accessible via notre module `redis_client` pour trois raisons principales :

1. **Performances In-Memory et Latence ultra-faible (< 1ms) :**  
   En conservant les données volatiles directement en mémoire RAM, Redis offre des lectures/écritures quasi-instantanées, indispensables pour le comptage de requêtes en temps réel.
2. **Gestion native de l'expiration des clés (TTL - Time To Live) :**  
   Grâce aux commandes d'expiration automatique (`setex`, `expire`), Redis supprime automatiquement les clés temporaires une fois leur durée de vie écoulée. Cela élimine le besoin d'exécuter des scripts de nettoyage (CRON) sur PostgreSQL.
3. **Opérations atomiques et gestion de la concurrence (`INCR`, `DELETE`) :**  
   Les commandes atomiques de Redis garantissent l'exactitude des compteurs (ex: Rate Limiting avec `slowapi`) même lorsque plusieurs requêtes simultanées arrivent de l'extension Chrome et du Frontend.

### Comment est-il implémenté (How) ?
Dans notre code Backend FastAPI :
- **Client Redis Centralisé :** Module `backend/app/core/redis_client.py` assurant la connexion au conteneur Redis.
- **Gestion du Rate Limiting :** Utilisation de la bibliothèque `slowapi` adossée à Redis pour brider le débit des requêtes vers les endpoints sensibles ou les appels d'API externes.
- **Conteneur Docker :** Image officielle `redis:7-alpine` exécutée dans le conteneur `trackit_redis` sur le port `6379`.

---

## 3. Conséquences et Compromis (Conséquences & Tradeoffs)

### Conséquences Positives (Benefits) :
- **Optimisation des I/O de la base de données :** Décharge PostgreSQL de toutes les écritures/lectures temporaires à haute fréquence.
- **Respect strict des Quotas API :** Empêche le bannissement de notre clé API par les plateformes tierces grâce à un contrôle fluide du débit.
- **Temps de réponse optimisés :** Amélioration globale de la réactivité de l'API FastAPI.

### Preuves d'implémentation (How) :
- **Infrastructure :** Service `redis` défini dans `docker-compose.yml`.
- **Code Backend :** Module de connexion dans `backend/app/core/redis_client.py` et intégration de `slowapi`.

---

## 4. Alternatives Rejetées (Rejected Alternatives) & Limitations

### Alternatives Rejetées :
1. **Dictionnaire In-Memory en Python (Mémoire vive du processus FastAPI) :**  
   Rejeté car la mémoire d'un processus Python n'est pas partagée entre plusieurs workers ou conteneurs, et toutes les données de cache/compteurs seraient perdues lors d'un redémarrage de l'application.
2. **Utilisation de tables temporaires dans PostgreSQL :**  
   Rejetée car l'écriture, la lecture et la suppression répétées de milliers de clés volatiles auraient inutilement surchargé le disque et augmenté la taille de la base de données (Table bloat).

### Limitations observées (Tradeoffs) :
- **Volatilité des données :** En cas de redémarrage du conteneur sans persistance activée, les données en mémoire sont réinitialisées (ce qui est acceptable pour du cache et des compteurs temporaires).
