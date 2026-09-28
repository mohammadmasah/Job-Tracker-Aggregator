# Job Tracker Companion

1. Démarre le projet (interface sur `http://localhost:3000`, API sur `http://localhost:8000`).
2. Dans Chrome, ouvre `chrome://extensions`, active le **Mode développeur**, puis clique sur **Charger l'extension non empaquetée** et sélectionne ce dossier.
3. Autorise l'accès à localhost pour que l'extension puisse envoyer les offres avec ta session de connexion.
4. Connecte-toi sur `http://localhost:3000` dans le même profil Chrome (utilise bien `localhost`, pas `127.0.0.1`).
5. Ouvre une offre sur un site pris en charge, actualise la page, puis clique sur **Enregistrer dans le Dashboard** dans l'extension.

Après une mise à jour, clique sur **Recharger** sur la carte de l'extension dans `chrome://extensions`, puis actualise l'onglet de l'offre. Si Chrome demande de confirmer une nouvelle permission, accepte l'accès à localhost.

Une erreur 401 signifie que la session n'est pas transmise ou a expiré. Vérifie la connexion, le profil Chrome et l'accès de l'extension à localhost. Selon la [documentation Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies), le blocage des cookies tiers peut aussi empêcher l'envoi de la session malgré cette permission ; vérifie les exceptions pour ce site local si le problème persiste.

Tests : `node --test job-tracker-extension/popup.test.cjs` depuis la racine du projet.
