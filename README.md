# Résolveur d'irritants

Agent conversationnel d'IA générative qui aide chaque utilisateur à trouver une solution à un irritant de son activité (tâche pénible, perte de temps, friction entre équipes, outil mal adapté…).

Chaque utilisateur utilise **sa propre clé API** et choisit **son fournisseur** :
**Groq** par défaut (modèle `openai/gpt-oss-120b`), ou OpenAI, Anthropic (Claude), Google (Gemini), Mistral AI et OpenRouter.

## Fonctionnement

- Application 100 % statique (HTML, CSS, JavaScript), hébergée sur Firebase Hosting.
- Aucun serveur : la clé API reste dans le navigateur et part **directement** chez le fournisseur choisi.
- Partage facultatif d'une **fiche irritant anonyme** (avec consentement) dans Firestore, et **page de suivi** réservée (`/suivi`, connexion Google) pour traiter les irritants en boucle retour : statuts, commentaires, mots-clés, export Excel.
- Déroulé court pour les collaborateurs : l'agent pose **3 questions**, puis propose **3 solutions** (une rapide sans IA, une d'organisation, une avec l'IA) et invite à partager la fiche de l'irritant.
- Réponses affichées en temps réel, bouton « Arrêter », export de la conversation en Markdown.

## Arborescence

```
agent-irritants/
├── .github/workflows/
│   └── deploy.yml          ← mise en ligne automatique sur Firebase à chaque modification
├── public/                 ← le site publié
│   ├── index.html          ← application (configuration + conversation + partage de fiche)
│   ├── suivi.html          ← page de suivi des irritants (réservée)
│   ├── confidentialite.html← politique de confidentialité (à compléter)
│   ├── favicon.svg
│   ├── css/style.css
│   └── js/
│       ├── app.js          ← logique de l'interface
│       ├── providers.js    ← connexion aux fournisseurs d'IA
│       ├── prompt.js       ← consignes de l'agent et catégories (à personnaliser)
│       ├── firebase.js     ← connexion à la base de données
│       ├── suivi.js        ← logique de la page de suivi
│       └── markdown.js     ← mise en forme sécurisée des réponses
├── firebase.json           ← configuration d'hébergement + en-têtes de sécurité
├── firestore.rules         ← règles de sécurité de la base (à coller dans la console)
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
