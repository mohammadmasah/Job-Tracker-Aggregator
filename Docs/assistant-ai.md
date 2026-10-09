# Assistant IA : Ollama ou clé API personnelle

Dans **Paramètres → Assistant IA**, choisis Ollama, OpenAI, Gemini ou Claude.
Ollama reste le choix par défaut. Pour une API distante :

1. Colle ta clé API et l’identifiant exact d’un modèle de conversation accessible à ton compte fournisseur.
2. Lis et accepte les informations concernant les données envoyées.
3. Clique sur **Tester la connexion**, puis **Activer cet assistant**. Le test est valable dix minutes et doit être refait si la configuration change.

Le test envoie uniquement un message neutre (« Reply only OK. »). Il peut consommer du crédit API. Il n’active pas le fournisseur et n’enregistre pas la clé. L’activation sauvegarde la configuration et s’applique aux prochains messages, y compris aux PDF. Le fournisseur actif est indiqué dans le chat. Les conversations restent enregistrées dans TrackIt ; l’historique utile et le contexte de l’espace sont transmis au fournisseur sélectionné lorsqu’une génération distante est nécessaire.

Tu peux revenir à Ollama à tout moment sans supprimer les configurations enregistrées. Supprimer la clé du service actif sélectionne explicitement Ollama. Les erreurs de quota, d’accès ou de connexion ne déclenchent jamais un changement automatique de fournisseur. Les réponses restent soumises au contrôle français/anglais existant.

## Stockage et sauvegardes

Chaque compte possède sa sélection et ses configurations. Les clés API sont chiffrées avec Fernet avant stockage dans la base. Les API de lecture renvoient uniquement le modèle et la présence d’une clé, jamais sa valeur. Aucun endpoint personnalisé n’est accepté : les appels sont envoyés aux adresses HTTPS officielles et les clés restent dans les en-têtes.

La clé de chiffrement `ai-credentials.key` est distincte de la base :

- application téléchargeable : dans le répertoire de données TrackIt, conservé lors du remplacement de l’application ;
- Docker Compose : volume persistant `ai_credentials`, monté dans `/app/.private` ;
- développement Python : `backend/.private`, ou le chemin défini par `TRACKIT_AI_KEY_DIR`.

Sauvegarde la base **et** ce fichier de clé ensemble dans un emplacement privé. Sans ce fichier, il faut ressaisir les clés API. Ne le publie pas. Un accès complet au compte système peut accéder aux données de l’application ; le chiffrement de la base ne remplace pas la protection de l’ordinateur.

## Vérification

`PYTHONPATH=backend python -m unittest discover -s backend/tests`

Les tests couvrent l’isolation des comptes, le stockage chiffré, l’accord requis, l’expiration des tests, le changement de service, les formats de flux des trois API et les erreurs sans divulgation de secrets. Les réponses des fournisseurs sont simulées : une clé réelle est nécessaire pour valider l’accès de chaque compte et modèle depuis l’interface.

Références des adaptateurs : [OpenAI Responses](https://developers.openai.com/api/docs/guides/streaming-responses), [Gemini GenerateContent](https://ai.google.dev/api/generate-content), [Claude Messages](https://platform.claude.com/docs/en/build-with-claude/streaming).
