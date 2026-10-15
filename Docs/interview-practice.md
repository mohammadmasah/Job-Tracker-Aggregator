# Préparer mon entretien

Dans le menu, **Préparer mon entretien** remplace **Offres**. Les anciennes adresses `/offers` ouvrent ce nouvel espace ; le catalogue reste accessible via **Explorer les offres enregistrées** (`/job-offers`).

## Parcours

1. Recherche une entreprise ou un intitulé dans les candidatures et les offres enregistrées.
2. Choisis le poste. Ses informations sont copiées dans une séance privée : une modification ou suppression ultérieure de la candidature ne supprime pas l’entraînement.
3. Choisis français ou anglais, un entretien complet, de motivation ou de compétences métier, et 5 ou 8 questions.
4. Facultatif : colle ton parcours ou importe le texte d’un CV PDF (5 Mo, 10 pages, 8 000 caractères maximum). L’import remplace le texte du champ ; vérifie-le avant de commencer. Les PDF scannés sans texte ne sont pas reconnus.
5. Commence la séance. Poulpie prépare une fiche du poste et pose une question à la fois. Chaque réponse reçoit un retour et une proposition de reformulation à adapter à ton expérience réelle.
6. À la fin, génère le bilan. Tu peux aussi terminer après au moins une réponse : seuls les échanges déjà envoyés sont évalués.
7. Télécharge le PDF : synthèse, points forts et axes de progression reliés aux réponses, actions à travailler, questions à poser et transcription. Le téléchargement ne sollicite pas l’IA.

Les réponses enregistrées, réglages et bilans restent disponibles dans **Mes entraînements**. Les séances sont séparées du petit chatbot quotidien, masqué dans cet espace. Une séance peut être supprimée après confirmation.

## Données et IA

La séance utilise le fournisseur actuellement sélectionné dans **Paramètres → Assistant IA**. Ollama traite les demandes localement ; avec OpenAI, Gemini ou Claude, les informations du poste, le parcours et les réponses sont transmis au fournisseur configuré. La sélection et l’accord de l’espace Assistant IA restent applicables. Aucun basculement automatique vers un autre fournisseur n’a lieu en cas d’erreur.

Le contexte envoyé contient uniquement le poste choisi et la séance, pas toute la base de candidatures. Le CV original n’est pas conservé par l’import ; son texte est enregistré dans la séance au démarrage. Les clés API ne figurent ni dans les réponses HTTP ni dans les PDF.

Le bilan est un conseil d’entraînement, pas une évaluation par l’employeur ni une probabilité d’embauche. Ses observations doivent citer un extrait réel d’une réponse. La précision des conseils dépend du modèle ; un résultat non exploitable affiche une erreur et peut être relancé. Aucun score de recrutement n’est produit.

## Fonctionnement technique

- Table additive `InterviewSession`, créée au démarrage ; aucune migration destructive des données existantes.
- Sessions filtrées par compte, instantané du poste, historique et rapport JSON validé.
- Vérification de révision avant/après génération pour éviter l’écrasement par deux onglets ; identifiant de requête pour les répétitions immédiates.
- Limite de temps et messages d’erreur sans détails fournisseur sensibles. Un contenu trop long est refusé explicitement, sans réduction silencieuse du poste.
- Rapport PDF produit par ReportLab avec polices embarquées, compatible avec la construction autonome.

## Vérification

```sh
PYTHONPATH=backend python -m unittest discover -s backend/tests
node --test frontend/src/api/interviews.test.js
VITE_STANDALONE=1 npm run build --prefix frontend
```

La vérification manuelle consiste à rechercher un poste, démarrer avec le modèle choisi, répondre, recharger la page, terminer la séance et télécharger le PDF. Les tests automatisés couvrent notamment les accès entre comptes, les conflits de révision, les réponses mal formées, les références du bilan et la mise en page des longues réponses.
