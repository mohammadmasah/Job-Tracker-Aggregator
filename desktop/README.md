# TrackIt — application locale

## Deux éditions

- **Utilisateurs :** télécharge l'archive de ton système depuis [GitHub Releases](https://github.com/mohammadmasah/Job-Tracker-Aggregator/releases), extrais-la entièrement et ouvre **TrackIt**. Aucun Python, Node, Docker, PostgreSQL ou Redis à installer. Le navigateur s'ouvre sur `http://localhost:3000`.
- **Développeurs :** utilise le code source et Docker Compose, avec PostgreSQL et Redis. Sur Mac, utilise aussi `compose.macos.yaml` et Ollama natif pour le GPU.

La première distribution est une **préversion portable**, pas un installateur signé. Windows x64, macOS Apple Silicon, macOS Intel et Linux x64 (Ubuntu 22.04 ou plus récent) ont chacun leur archive. Il ne s'agit pas d'un même exécutable universel. Les tests automatisés valident chaque exécutable avant publication ; le téléchargement/accélération du modèle IA nécessite également une validation matérielle sur les systèmes ciblés.

Sur Mac, ouvre `TrackIt.app`. Sur Windows, conserve le dossier `_internal` à côté de `TrackIt.exe`. Sur Linux, conserve tout le dossier et lance `TrackIt` (gestionnaire de fichiers ou terminal). Les systèmes peuvent afficher un avertissement pour un binaire non signé ; la signature Apple/Windows n'est pas configurée dans ce dépôt. Ne désactive pas globalement les protections du système.

## Premier lancement

1. Arrête l'édition Docker si elle utilise déjà les ports 3000 ou 8000. Si `localhost:3000` affiche tes anciennes données alors que TrackIt ne démarre pas, c'est la version Docker qui répond, pas l'archive téléchargée. Les nouvelles archives ne réinitialisent jamais automatiquement une base existante.
2. Lance TrackIt et crée ton compte local. Chaque installation démarre avec une base vide, sans les données du développeur.
3. Pour le chatbot, ouvre **Installation locale · IA** et choisis **Activer l'IA locale**. TrackIt télécharge une version vérifiée d'Ollama dans son propre dossier, puis `llama3.2`. Prévois jusqu'à 3,5 Go de téléchargement et au moins 8 Go libres ; le temps et les performances dépendent du matériel. Aucun installateur externe n'est lancé, aucun droit administrateur n'est demandé.
4. Les candidatures et contacts fonctionnent sans IA. Après le téléchargement, le chat fonctionne localement. Les offres en ligne nécessitent Internet ; les fournisseurs demandant des clés API ne sont pas préconfigurés. L'envoi d'e-mails nécessite une configuration SMTP ; dans l'édition locale, les tentatives de connexion bloquent temporairement le compte pendant 15 minutes plutôt que d'exiger un e-mail.
5. Pour fermer le service, utilise **Installation locale · IA → Arrêter TrackIt**. Fermer un onglet ou se déconnecter ne ferme pas le service.

L'extension Chrome reste optionnelle et se charge séparément depuis son dossier, comme documenté dans `job-tracker-extension/README.md`.

## Données et sauvegarde

- macOS : `~/Library/Application Support/TrackIt`
- Windows : `%LOCALAPPDATA%\TrackIt`
- Linux : `~/.local/share/TrackIt` (ou `$XDG_DATA_HOME/TrackIt`)

La base SQLite `trackit.db`, les documents `uploads/`, le secret de session et le cache de connexion sont conservés hors du dossier de l'application. Arrête TrackIt puis copie ce dossier pour faire une sauvegarde. Remplacer le programme ne supprime pas ces données. Le modèle IA est également stocké ici. Aucune migration automatique des données PostgreSQL du développeur n'est effectuée.

## Construction et publication

Le workflow `.github/workflows/standalone.yml` construit les quatre plateformes sur leurs systèmes respectifs, teste inscription, connexion, création, persistance après redémarrage et déconnexion, puis archive les exécutables avec une somme SHA-256.

- Lancement manuel : workflow **Standalone downloads** → **Run workflow**, archives dans les artifacts du run.
- Publication : pousser un tag `v…`. Si toutes les constructions et tests réussissent, le workflow publie une préversion GitHub avec les quatre téléchargements.
- Lien à partager sur LinkedIn : la page d'une release réussie ; les visiteurs choisissent leur système. Ne présente pas un simple ZIP du code source comme une application installable.

Construction manuelle pour développeur : Python 3.11, Node 22, dépendances de `backend/requirements.txt` et `pyinstaller==6.22.3`. Construis le frontend avec `VITE_STANDALONE=1 npm run build`, puis lance `python desktop/build.py`. Sur PowerShell, définis `$env:VITE_STANDALONE="1"` avant le build. La compilation inclut uniquement le frontend compilé et les modules nécessaires, jamais `.env`, les fichiers uploadés ni les bases de travail.

Références : [PyInstaller — builds par plateforme](https://pyinstaller.org/en/stable/usage.html), [Ollama v0.34.4 et sommes de contrôle](https://github.com/ollama/ollama/releases/tag/v0.34.4). Les composants tiers et les modèles conservent leurs propres licences.
