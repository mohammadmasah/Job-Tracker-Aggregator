# Test avec 500 candidatures fictives

Mesures effectuées le 27 septembre 2026 sur l'installation locale ; rapport finalisé le 28 septembre.

## Données ajoutées

500 candidatures en français, réparties entre dix secteurs, dix villes et quatre
types de contrat. Les deux candidatures préexistantes ont été conservées :
la base contenait donc 502 candidatures lors des mesures.

| Statut | Candidatures de test |
|---|---:|
| À postuler | 70 |
| Postulé | 150 |
| Entretien | 100 |
| Test technique | 50 |
| Offre reçue | 30 |
| Acceptée | 20 |
| Refusée | 80 |
| Total | 500 |

Les entreprises portent le suffixe « Démo NNN ». Les notes commencent par
`[TEST DE CHARGE — 500 CANDIDATURES — V1]` et les URL utilisent exclusivement
`https://example.invalid/test-charge-500-v1/`.
Aucune candidature n'a été envoyée à une entreprise.

## Reproduire le jeu de données

Depuis la racine du projet :

```bash
docker compose -f docker-compose.yml -f compose.macos.yaml build backend
docker compose -f docker-compose.yml -f compose.macos.yaml run --rm --no-deps backend python -m app.seed_load_test
```

Le script ajoute uniquement les entrées de démonstration manquantes. Il ne vide
pas la base et ne remplace pas les modifications des entrées déjà présentes.
Il conserve les dates fixes pour que les exécutions restent reproductibles.
Le test automatisé vérifie les 500 entrées, leur répartition, l'absence de doublons
lors d'une deuxième exécution et la conservation des données préexistantes.

## Résultats

Insertion groupée des 500 entrées via SQLModel : **0,108 seconde** (transaction
et vérification incluses). Cette mesure ne représente pas 500 soumissions HTTP.

Les routes réelles FastAPI ont été appelées trois fois chacune avec TestClient,
sur PostgreSQL local. L'authentification était remplacée uniquement dans le
processus de test. Les mesures incluent les requêtes SQL et la sérialisation,
mais excluent le réseau navigateur, le rendu React et le coût d'authentification.

| Opération | Temps des trois appels (ms) | Requêtes SQL par appel | Résultat |
|---|---|---:|---|
| Liste complète | 247,02 / 232,58 / 239,22 | 1 005 | HTTP 200, 502 entrées |
| Nombre total | 5,89 / 4,59 / 4,74 | 1 | HTTP 200 |
| Filtre entretien | 6,15 / 4,57 / 4,69 | 1 | HTTP 200, 101 entrées avec les données préexistantes |
| Détail d'une candidature de test | 3,21 / 2,03 / 2,11 | 3 | HTTP 200 |

La liste complète représente 266 416 octets. La construction du contexte du
chatbot a pris 12,34 ms et produit 255 439 caractères. La question directe
« Combien de candidatures ai-je ? » a reçu « Tu as 502 candidatures au total. »
en 31,35 ms, via le calcul déterministe, sans génération par le modèle.

## Conclusion et limites

- Les opérations API mesurées réussissent avec 502 candidatures.
- La liste souffre de requêtes répétées pour charger les relations : 1 005
  requêtes pour 502 lignes. Un chargement groupé des contacts et documents,
  puis une pagination, sont les prochaines pistes d'optimisation.
- Le contexte du chatbot contient actuellement l'intégralité des données.
  255 439 caractères représentent un risque important de dépassement de sa
  fenêtre configurée de 8 192 tokens. La réussite du comptage direct ne valide
  pas les réponses détaillées du modèle sur l'ensemble des 500 dossiers.
  Il faudra sélectionner les enregistrements pertinents avant la génération.
- Le contrôle du navigateur n'était pas autorisé : fluidité du défilement,
  rendu des cartes et délais visuels non mesurés.
- Ce test porte sur le volume de données, pas sur 500 utilisateurs simultanés,
  la charge concurrente ou une garantie de performance en production.

Les données de démonstration restent dans la base locale pour les essais manuels.
Le dépôt contient leur générateur ; aucune copie de données personnelles n'est publiée.
