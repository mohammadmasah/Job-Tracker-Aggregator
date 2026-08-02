# ADR 004 : Architecture de Sécurité – Authentification JWT par Cookies HTTPOnly, Verrouillage Dynamique et Protection Anti-Abus

* **Statut :** Accepté
* **Date :** 2026-08-02
* **Auteurs :** Mohammad Masah (Équipe TrackIT)

---

## 1. Contexte (Contexte)
L'application TrackIT nécessite un mécanisme d'authentification robuste pour protéger les données personnelles des utilisateurs (CV, candidatures) et sécuriser les échanges entre le Frontend React, l'Extension Chrome et l'API FastAPI.

Les objectifs de sécurité principaux étaient :
1. **Stockage sécurisé des identifiants :** Ne jamais stocker de mots de passe en clair et résister aux attaques par tables de hachage (Rainbow Tables).
2. **Protection des jetons d'accès (Anti-XSS) :** Empêcher le vol du jeton d'authentification par des scripts malveillants exécutés côté navigateur.
3. **Protection contre le Brute-Force & Verrouillage Automatique :** Détecter les tentatives de connexion répétées et verrouiller le compte après 3 échecs tout en offrant un moyen de récupération sécurisé par e-mail.
4. **Protection contre les attaques DoS :** Limiter le nombre de requêtes abusives sur l'endpoint `/login`.

---

## 2. Choix d'Architecture de Sécurité (Décision)

### 1. Hashage fort avec Bcrypt (`app/core/security.py`)
- Nous utilisons la bibliothèque **Bcrypt** (`bcrypt.hashpw` avec `bcrypt.gensalt()`) pour hasher les mots de passe avant sauvegarde dans PostgreSQL.
- La vérification est effectuée via `bcrypt.checkpw`, garantissant un temps de calcul volontairement plus lent pour décourager les attaques automatisées.

### 2. Jetons JWT stockés en Cookies HTTPOnly (`app/api/user.py`)
- À la connexion réussie (`POST /api/user/login`), l'API génère un token JWT signé avec l'algorithme **HS256** et une clé secrète (`SECRET_KEY`).
- Le token est injecté dans un **Cookie HTTPOnly** (`access_token`) avec les paramètres :
  - `httponly=True` : Inaccessible via JavaScript (`document.cookie`), bloquant les attaques XSS.
  - `samesite="lax"` : Protection contre les attaques CSRF.
  - `max_age=1209600` (14 jours) : Aligné avec l'expiration du JWT.

### 3. Verrouillage Dynamique après 3 Échecs et Récupération par E-mail
Pour parer aux attaques par force brute tout en garantissant une expérience utilisateur fluide :
- À chaque échec de mot de passe sur `POST /api/user/login`, un compteur est incrémenté dans Redis (`failed:{email}`).
- **Blocage au 3ème échec :** Si le compteur atteint 3, le compte est immédiatement verrouillé temporairement (`lock:{email}`).
- **Notification & Token de Réinitialisation par E-mail :** Un e-mail d'alerte de sécurité est automatiquement envoyé à l'utilisateur contenant un lien muni d'un jeton unique de réinitialisation (`reset_token`) à durée de vie limitée (TTL de 30 min via `redis_client.setex`).
- **Déverrouillage :** La réinitialisation réussie du mot de passe via l'e-mail supprime les clés `lock:{email}` et `reset_token`, débloquant l'accès au compte de manière totalement sécurisée.

### 4. Control d'Accès Centralisé (`app/api/deps.py`)
- La fonction `get_current_user` extrait le cookie `access_token` de la requête HTTP (`request.cookies.get("access_token")`), le valide et récupère le profil utilisateur dans PostgreSQL.
- Si le token est absent, invalide ou si le compte est verrouillé, une exception `401 Unauthorized` ou `403 Forbidden` est retournée.

### 5. Limitation de débit multi-niveaux avec SlowAPI (`app/api/user.py`)
- L'endpoint de connexion est protégé par `@limiter.limit` sur 3 niveaux : `@limiter.limit("3/minute")`, `@limiter.limit("15/hour")`, et `@limiter.limit("30/day")`.

---

## 3. Conséquences et Compromis (Conséquences & Tradeoffs)

### Conséquences Positives (Benefits) :
- **Sécurité en Profondeur (Defense in Depth) :** Combinaison de la sécurité réseau, du hashage Bcrypt, de la protection XSS (HTTPOnly) et du verrouillage proactif via Redis.
- **Auto-récupération Sécurisée :** L'envoi automatique de l'e-mail de réinitialisation au 3ème échec alerte l'utilisateur d'une tentative d'intrusion tout en lui permettant de reprendre le contrôle de son compte sans intervention d'un administrateur.
- **Code Propre et Modulaire :** Centralisation du contrôle d'accès dans `app/api/deps.py`.

### Preuves d'implémentation (How) :
- **Hashage & JWT :** Code dans `app/core/security.py`.
- **Logic de Verrouillage & E-mail :** Implémenté dans `app/api/user.py` et contrôlé via Redis.
- **CORS & Rate Limiting :** Déclaré dans `app/main.py` et `app/api/user.py`.

---

## 4. Alternatives Rejetées (Rejected Alternatives) & Limitations

### Alternatives Rejetées :
1. **Verrouillage définitif du compte en base de données :**  
   Rejeté car cela imposerait une intervention manuelle d'un administrateur pour chaque erreur de saisie de mot de passe.
2. **Stockage du JWT dans le `localStorage` :**  
   Rejeté car vulnérable aux attaques XSS.
3. **Absence de limite de tentatives :**  
   Rejeté car cela exposerait l'API aux attaques par dictionnaire illimitées.

### Limitations observées (Tradeoffs) :
- **Dépendance au service d'envoi d'e-mails (SMTP) :** Si le service d'e-mail est indisponible, l'utilisateur devra attendre l'expiration du TTL Redis pour réessayer de se connecter.