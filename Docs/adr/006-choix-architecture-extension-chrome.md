# ADR 006 : Architecture de l'Extension Chrome (Job Tracker Companion)

* **Statut :** Accepté
* **Date :** 2026-08-02
* **Auteurs :** Mohammad Masah (Équipe TrackIT)

---

## 1. Contexte (Contexte)
Pour faciliter la saisie des offres d'emploi par les utilisateurs, le projet TrackIT nécessitait une solution permettant de capturer automatiquement les informations d'une annonce (titre du poste, entreprise, localisation, description, URL) directement depuis les sites de recrutement sans passer par un copier-coller manuel.

Nous avions besoin d'un composant léger, capable de s'intégrer au navigateur et de communiquer directement avec les endpoints API du Backend FastAPI (`POST /api/applications`).

---

## 2. Choix d'Architecture de l'Extension (Décision)

### 1. Utilisation de la Spécification Manifest V3
Nous avons développé l'extension sous la norme **Manifest V3** (`job-tracker-extension/manifest.json`), qui est le standard actuel requis par Google Chrome pour des raisons de sécurité, de performance et de gestion stricte des permissions.

### 2. Contrats d'Autorisation et Sites Supportés (`host_permissions`)
L'extension cible spécifiquement 7 plateformes majeures de recrutement via des injecteurs de scripts ciblés (`content_scripts`) :
- **HelloWork** (`*.hellowork.com`)
- **Welcome to the Jungle** (`welcometothejungle.com`)
- **JobTeaser** (`*.jobteaser.com`)
- **Indeed** (`*.indeed.com`)
- **WeLoveDevs** (`*.welovedevs.com`)
- **La Bonne Alternance** (`*.labonnealternance.apprentissage.beta.gouv.fr`)
- **LinkedIn Jobs** (`*.linkedin.com/jobs/*`)

### 3. Modèle d'Injection et Communication (`content.js` & `popup.js`)
L'architecture de l'extension se divise en deux scripts principaux :
- **`content.js` (DOM Scraper) :** Injecté directement dans le DOM des pages web ciblées pour parser et extraire le contenu structuré de l'offre d'emploi.
- **`popup.js` & `popup.html` (Interface Utilisateur) :** Affiche une interface compacte permettant à l'utilisateur de vérifier les données extraites, de sélectionner un statut de candidature et d'envoyer l'offre directement au Backend FastAPI (`POST /api/applications`).

---

## 3. Conséquences et Compromis (Conséquences & Tradeoffs)

### Conséquences Positives (Benefits) :
- **Expérience Utilisateur Unifiée (1-Click Saving) :** Réduction drastique du temps nécessaire pour enregistrer une candidature.
- **Sécurité et Respect du Manifest V3 :** Pas d'exécution de code à distance (`eval`), utilisation restreinte des permissions (`activeTab`, `scripting`).
- **Découplage :** L'extension est un client API autonome situé dans `job-tracker-extension/` à la racine du projet.

### Preuves d'implémentation (How) :
- **Configuration :** Déclarée dans `job-tracker-extension/manifest.json`.
- **Logique UI et Envoi API :** Gérées dans `job-tracker-extension/popup.js` et `job-tracker-extension/popup.html`.
- **Injection DOM :** Logique de scraping dans `job-tracker-extension/content.js`.

---

## 4. Alternatives Rejetées (Rejected Alternatives) & Limitations

### Alternatives Rejetées :
1. **Scraping Backend Automatisé (Selenium / Puppeteer dans FastAPI) :**  
   Rejeté car de nombreux sites de recrutement bloquent les bots automatisés (Anti-bot / Cloudflare). Exécuter le scraping directement sur le navigateur de l'utilisateur (côté client) évite tout blocage IP.

### Limitations observées (Tradeoffs) :
- **Maintenance du Selecteur DOM :** Si un site tiers (ex: LinkedIn ou Welcome to the Jungle) modifie sa structure HTML/CSS, les règles de sélection de `content.js` doivent être mises à jour.