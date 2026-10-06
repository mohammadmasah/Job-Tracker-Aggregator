# TrackIt — application locale

## Deux éditions

- **Utilisateurs :** télécharge l'archive de ton système depuis [GitHub Releases](https://github.com/mohammadmasah/Job-Tracker-Aggregator/releases), extrais-la entièrement et ouvre **TrackIt**. Aucun Python, Node, Docker, PostgreSQL ou Redis à installer. Le navigateur s'ouvre sur `http://localhost:3000`.
- **Développeurs :** utilise le code source et Docker Compose, avec PostgreSQL et Redis. Sur Mac, utilise aussi `compose.macos.yaml` et Ollama natif pour le GPU.

La première distribution est une **préversion portable**, pas un installateur signé. Windows x64, macOS Apple Silicon, macOS Intel et Linux x64 (Ubuntu 22.04 ou plus récent) ont chacun leur archive. Il ne s'agit pas d'un même exécutable universel. Les tests automatisés valident chaque exécutable avant publication ; le téléchargement/accélération du modèle IA nécessite également une validation matérielle sur les systèmes ciblés.

Sur Mac, ouvre `TrackIt.app`. Sur Windows, conserve le dossier `_internal` à côté de `TrackIt.exe`. Sur Linux, conserve tout le dossier et lance `TrackIt` (gestionnaire de fichiers ou terminal). Les systèmes peuvent afficher un avertissement pour un binaire non signé ; la signature Apple/Windows n'est pas configurée dans ce dépôt. Ne désactive pas globalement les protections du système.

## Premier lancement

1. Arrête l'édition Docker si elle utilise déjà les ports 3000 ou 8000. Si `localhost:3000` affiche tes anciennes données alors que TrackIt ne démarre pas, c'est la version Docker qui répond, pas l'archive téléchargée. Les nouvelles archives ne réinitialisent jamais automatiquement une base existante.
2. Lance TrackIt et crée ton compte local. Chaque installation démarre avec une base vide, sans les données du développeur.
3. Pour le chatbot, ouvre **Installation locale · IA** et choisis **Activer l'IA locale**. TrackIt télécharge une version vérifiée d'Ollama dans son propre dossier, puis `qwen3:1.7b`. Prévois jusqu'à 3 Go de téléchargement et au moins 6 Go libres ; le temps et les performances dépendent du matériel. Aucun installateur externe n'est lancé, aucun droit administrateur n'est demandé.
4. Les candidatures et contacts fonctionnent sans IA. Après le téléchargement, le chat fonctionne localement. Les offres en ligne nécessitent Internet ; les fournisseurs demandant des clés API ne sont pas préconfigurés. L'envoi d'e-mails nécessite une configuration SMTP ; dans l'édition locale, les tentatives de connexion bloquent temporairement le compte pendant 15 minutes plutôt que d'exiger un e-mail.
5. Pour fermer le service, utilise **Installation locale · IA → Arrêter TrackIt**. Fermer un onglet ou se déconnecter ne ferme pas le service.

L'extension Chrome reste optionnelle et se charge séparément depuis son dossier, comme documenté dans `job-tracker-extension/README.md`.

## IA légère et langues

Le modèle par défaut est [Qwen3 1.7B](https://ollama.com/library/qwen3:1.7b), environ 1,4 Go, exécuté par Ollama avec le mode réflexion désactivé. Le moteur privé charge un seul modèle à la fois ; le modèle est déchargé après deux minutes d'inactivité. Cela réduit la charge, sans garantir une vitesse identique sur tous les ordinateurs. Le moteur Ollama reste nécessaire et se prépare automatiquement depuis l'application.

Depuis une bêta antérieure à la Beta 6, arrête TrackIt et remplace une dernière fois l'application pour bénéficier des mises à jour intégrées. Les candidatures, documents et conversations existants restent conservés. Les anciens modèles ne sont pas supprimés automatiquement. Un modèle déjà préparé est réutilisé sans téléchargement au prochain lancement.

## Mettre à jour TrackIt

Dans **Installation locale · IA**, clique sur **Vérifier les mises à jour**, puis **Télécharger la mise à jour**. Enregistre tes formulaires ouverts et choisis **Installer et redémarrer** : la page se recharge après le redémarrage. Aucune manipulation d'archive n'est nécessaire après l'installation de la Beta 6.

La vérification consulte le flux public `releases.atom` du projet, sans utiliser l'API REST limitée par adresse IP ni demander de jeton GitHub. Elle n'envoie ni candidatures ni documents. Les bêtas sont incluses ; l'archive du système et son fichier SHA-256 doivent être disponibles avant de proposer une mise à jour. Le résultat, y compris une erreur temporaire, est conservé une minute pour éviter les requêtes répétées. Une panne réseau est signalée comme telle, jamais comme une confirmation que l'application est à jour. Le téléchargement est vérifié avec sa somme SHA-256 avant extraction. Prévois 3 Go libres et un dossier d'installation accessible en écriture ; sur Mac, déplace d'abord l'application dans Applications. Les versions non signées restent soumises aux protections habituelles du système.

L'installateur conserve temporairement l'ancien programme et une copie SQLite dans un dossier `.trackit-update-*` voisin de l'application. Si le nouveau programme ne démarre pas, il tente de relancer l'ancien. Une sauvegarde de base reste disponible pour une récupération manuelle si une future migration de schéma échoue. La copie d'une mise à jour réussie est nettoyée lors de la préparation de la suivante. Les mises à jour ne modifient pas les modèles IA ni les documents.

Les réponses sont limitées au français et à l'anglais ; les demandes dans une autre langue sont traitées en français. Le texte généré est vérifié par phrase avant affichage et enregistrement. Si une langue non autorisée est détectée, une courte invitation en français remplace la suite. Les noms du répertoire, adresses et blocs de code peuvent conserver leur écriture d'origine. La détection automatique peut se tromper, surtout sur les fragments très courts.

## Données et sauvegarde

Dans **Mes candidatures → Exporter Excel**, choisis toutes les candidatures ou un statut, puis **Télécharger le fichier Excel**. Le fichier contient une synthèse des effectifs par statut et une liste détaillée avec les entreprises, postes, dates et coordonnées des contacts liés. Les descriptions et notes sont exclues. Ce choix est indépendant des filtres de recherche affichés ; les données sont relues au téléchargement. L’export est disponible sans activer l’IA.

- macOS : `~/Library/Application Support/TrackIt`
- Windows : `%LOCALAPPDATA%\TrackIt`
- Linux : `~/.local/share/TrackIt` (ou `$XDG_DATA_HOME/TrackIt`)

La base SQLite `trackit.db`, les documents `uploads/`, le secret de session et le cache de connexion sont conservés hors du dossier de l'application. Arrête TrackIt puis copie ce dossier pour faire une sauvegarde. Remplacer le programme ne supprime pas ces données. Le modèle IA est également stocké ici. Aucune migration automatique des données PostgreSQL du développeur n'est effectuée.

## Construction et publication

Le workflow `.github/workflows/standalone.yml` construit les quatre plateformes sur leurs systèmes respectifs, teste inscription, connexion, création, export Excel, persistance et déconnexion, puis archive les exécutables avec une somme SHA-256. Un second test compile une version supérieure dans un dossier temporaire et utilise un serveur HTTP de test pour exercer la découverte, le téléchargement, la vérification SHA-256, le remplacement et le redémarrage. Il vérifie le nouveau numéro de version et la conservation de la session et d'une candidature. Cette version de test n'est jamais publiée et aucun serveur alternatif n'est configurable dans les exécutables distribués.

La version compilée est définie dans `backend/app/core/version.py` : elle doit correspondre au tag publié. La publication ordinaire préserve les anciens fichiers. `desktop/refresh_downloads.py SOURCE_TAG TARGET_TAG BACKUP_DIRECTORY` permet, uniquement sur demande explicite, de remplacer les fichiers d'un lien déjà partagé sans déplacer son tag Git. Il sauvegarde les anciens fichiers et compteurs de téléchargement, vérifie les nouvelles archives, puis relit les téléchargements publiés. GitHub remet à zéro les compteurs des fichiers remplacés ; les compteurs antérieurs restent dans la sauvegarde `release-before.json`.

- Lancement manuel : workflow **Standalone downloads** → **Run workflow**, archives dans les artifacts du run.
- Publication : pousser un tag `v…`. Si toutes les constructions et tests réussissent, le workflow publie une préversion GitHub avec les quatre téléchargements.
- Lien à partager sur LinkedIn : la page d'une release réussie ; les visiteurs choisissent leur système. Ne présente pas un simple ZIP du code source comme une application installable.

Construction manuelle pour développeur : Python 3.11, Node 22, dépendances de `backend/requirements.txt` et `pyinstaller==6.22.3`. Construis le frontend avec `VITE_STANDALONE=1 npm run build`, puis lance `python desktop/build.py`. Sur PowerShell, définis `$env:VITE_STANDALONE="1"` avant le build. La compilation inclut uniquement le frontend compilé et les modules nécessaires, jamais `.env`, les fichiers uploadés ni les bases de travail.

Références : [PyInstaller — builds par plateforme](https://pyinstaller.org/en/stable/usage.html), [Ollama v0.34.4 et sommes de contrôle](https://github.com/ollama/ollama/releases/tag/v0.34.4). Les composants tiers et les modèles conservent leurs propres licences.
