# ADR 0001 : Choix d'Orchestration IA avec LangChain et Intégration d'Ollama (Llama 3.2)

* **Statut :** Accepté
* **Date :** 2026-08-02
* **Auteurs :** Mohammad Masah (Équipe TrackIT)

---

## 1. Contexte (Contexte)
Dans le cadre du projet TrackIT, nous avons développé un assistant intelligent (Chatbot) capable d'analyser les fiches de poste, d'évaluer la pertinence des CV et d'échanger de manière interactive avec l'utilisateur.

Pour orchestrer cette logique d'Intelligence Artificielle côté serveur (FastAPI), nous avions besoin d'un framework capable de :
1. Structurer les prompts et gérer le flux de discussion.
2. Maintenir une mémoire conversationnelle (historique des échanges par session).
3. S'interfacer facilement avec un moteur d'exécution LLM local sans dépendre d'API cloud payantes.

---

## 2. Choix de LangChain et d'Ollama (Décision)

### Pourquoi LangChain plutôt que PydanticAI (Why) ?
Bien que des alternatives récentes comme **PydanticAI** offrent une meilleure intégration native avec le typage Python et la légèreté de FastAPI, **LangChain** a été sélectionné pour trois raisons majeures :

1. **Intégration native et éprouvée avec Ollama (`ChatOllama`) :**  
   LangChain fournit la classe `ChatOllama` qui gère parfaitement les communications HTTP asynchrones sur le réseau Docker interne (`http://ollama:11434`), sans nécessiter de couche d'adaptation supplémentaire.
2. **Gestion clé en main de la mémoire conversationnelle (`RunnableWithMessageHistory`) :**  
   Grâce à cet utilitaire, nous avons évité de réécrire manuellement la logique complexe de stockage, de récupération et de fenêtrage de l'historique des discussions par `session_id` dans FastAPI.
3. **Écosystème prêt pour le RAG (Retrieval-Augmented Generation) :**  
   LangChain offre une extensibilité native si nous souhaitons faire évoluer TrackIT vers l'analyse avancée de documents PDF (CV) via des bases de données vectorielles (VectorDB).

### Intégration d'Ollama & Llama 3.2 (3B)
L'exécution locale repose sur le modèle **Llama 3.2 (3B Instruct)** hébergé dans un conteneur Docker dédié (`trackit_ollama`) accessible sur le port `11434`.

### Comment est-il implémenté (How) ?
Dans notre code Backend (`backend/app/routes/chatbot.py` et `backend/app/services/chatbot.py`) :
- **Gestion des Prompts :** Utilisation de templates structurés (`PromptTemplate`) donnant un rôle d'expert en recrutement au chatbot.
- **Gestion de la Mémoire :** Maintien du contexte grâce à `RunnableWithMessageHistory` lié à l'ID de session de l'utilisateur.

---

## 3. Conséquences et Compromis (Conséquences & Tradeoffs)

### Conséquences Positives (Benefits) :
- **Confidentialité totale :** Les CV et données personnelles des utilisateurs ne quittent jamais le serveur local.
- **Coût d'exploitation nul :** Aucune dépendance financière vis-à-vis des API payantes comme OpenAI.
- **Maintenabilité du code :** Découplage clair entre l'API FastAPI et le moteur IA grâce aux abstractions LangChain.

### Preuves d'implémentation (How) :
- **Service Backend :** Code d'orchestration dans `backend/app/routes/chatbot.py` et `backend/app/services/chatbot.py`.
- **Infrastructure :** Configuration du conteneur `trackit_ollama` dans `docker-compose.yml`.

---

## 4. Alternatives Rejetées (Rejected Alternatives) & Limitations

### Alternatives Rejetées :
1. **PydanticAI :** Rejeté malgré son excellente intégration avec FastAPI, car il manque encore de maturité sur la gestion avancée de l'historique de session et offre un écosystème moins riche que LangChain pour les fonctionnalités RAG futures.
2. **Appels HTTP bruts à l'API d'Ollama (sans framework) :** Rejetés car cela aurait imposé le développement manuel de la gestion du contexte, du formatage des prompts et des mécanismes de retry.
3. **API OpenAI (GPT-4) :** Rejetée en raison des coûts récurrents par token et de la non-conformité avec le traitement local des CV.

### Limitations observées (Tradeoffs & Métriques) :
- **Limite de connaissances temporelles (Knowledge Cutoff) :** Les connaissances natives de Llama 3.2 sont limitées aux données d'entraînement disponibles jusqu'à sa date de coupure. Le modèle n'a pas conscience des événements récents, des évolutions technologiques ou des nouvelles opportunités du marché publiées après cette date, rendant nécessaire l'utilisation d'outils externes ou de bases de données dynamiques pour les données en temps réel.
- **Consommation élevée de ressources CPU :** Lors des tests d'inférence en local sur une puce Apple M4 (architecture ARM), l'exécution du modèle via le conteneur Docker a généré un pic d'utilisation du CPU atteignant **jusqu'à 98%**. Cela démontre que bien que le modèle 3B soit léger, son exécution peut s'avérer extrêmement lente et chronophage sur des machines disposant de configurations matérielles inférieures ou sans accélération matérielle dédiée.