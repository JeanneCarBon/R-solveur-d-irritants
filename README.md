# Résolveur d'irritants

Agent conversationnel d'IA générative qui aide chaque utilisateur à trouver une solution à un irritant de son activité (tâche pénible, perte de temps, friction entre équipes, outil mal adapté…).

Chaque utilisateur utilise **sa propre clé API** et choisit **son fournisseur** :
**Groq** par défaut (modèle `openai/gpt-oss-120b`), ou OpenAI, Anthropic (Claude), Google (Gemini), Mistral AI et OpenRouter.

## Fonctionnement

- Application 100 % statique (HTML, CSS, JavaScript), hébergée sur Firebase Hosting.
- Aucun serveur, aucune base de données : la clé API reste dans le navigateur et part **directement** chez le fournisseur choisi.
- L'agent suit une méthode en 5 étapes : comprendre, analyser les causes, proposer des solutions (gains rapides, moyen terme, structurel), plan d'action, indicateurs.
- Réponses affichées en temps réel, bouton « Arrêter », export de la conversation en Markdown.

## Arborescence

```
agent-irritants/
├── .github/workflows/
│   └── deploy.yml          ← mise en ligne automatique sur Firebase à chaque modification
├── public/                 ← le site publié
│   ├── index.html          ← page unique (configuration + conversation)
│   ├── favicon.svg
│   ├── css/style.css
│   └── js/
│       ├── app.js          ← logique de l'interface
│       ├── providers.js    ← connexion aux fournisseurs d'IA
│       ├── prompt.js       ← consignes de l'agent (à personnaliser)
│       └── markdown.js     ← mise en forme sécurisée des réponses
├── firebase.json           ← configuration d'hébergement + en-têtes de sécurité
├── .gitignore
├── GUIDE.md                ← guide de mise en ligne pas à pas
├── Guide-mise-en-ligne.pdf ← le même guide en PDF
└── README.md
```

## Mise en ligne

Entièrement depuis le navigateur, sans logiciel à installer : suivez le [guide pas à pas](GUIDE.md).
En résumé : projet Firebase, compte de service Google Cloud, secret `FIREBASE_SERVICE_ACCOUNT` et variable `FIREBASE_PROJECT_ID` dans GitHub, puis dépôt des fichiers. GitHub Actions publie le site à chaque modification de la branche `main`.

## Personnaliser l'agent

Modifiez `public/js/prompt.js` (consignes et exemples d'irritants) directement sur GitHub : la nouvelle version est publiée automatiquement.
