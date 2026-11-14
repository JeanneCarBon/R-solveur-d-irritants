# Résolveur d'irritants

Agent conversationnel d'IA générative qui aide chaque utilisateur à trouver une solution à un irritant de son activité (tâche pénible, perte de temps, friction entre équipes, outil mal adapté…).

Chaque utilisateur utilise **sa propre clé API** et choisit **son fournisseur** :
OpenAI, Anthropic (Claude), Google (Gemini), Mistral AI, Groq ou OpenRouter.

## Fonctionnement

- Application 100 % statique (HTML, CSS, JavaScript), hébergée sur Firebase Hosting.
- Aucun serveur, aucune base de données : la clé API reste dans le navigateur et part **directement** chez le fournisseur choisi.
- L'agent suit une méthode en 5 étapes : comprendre, analyser les causes, proposer des solutions (gains rapides, moyen terme, structurel), plan d'action, indicateurs.
- Réponses affichées en temps réel, bouton « Arrêter », export de la conversation en Markdown.

## Arborescence

```
agent-irritants/
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
├── .firebaserc             ← identifiant du projet Firebase (à compléter)
├── .gitignore
├── GUIDE.md                ← guide de mise en ligne pas à pas
└── README.md
```

## Mise en ligne

Suivez le [guide pas à pas](GUIDE.md).

## Personnaliser l'agent

Modifiez le texte de `public/js/prompt.js` (consignes et exemples d'irritants), puis redéployez.
