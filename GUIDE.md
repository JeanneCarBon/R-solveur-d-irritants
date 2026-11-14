# Guide de mise en ligne pas à pas

Ce guide vous emmène du dossier de fichiers jusqu'à une application en ligne, accessible à vos utilisateurs par une adresse du type `https://votre-projet.web.app`.

Durée : 30 à 45 minutes la première fois. Coût : 0 € (le plan gratuit « Spark » de Firebase suffit ; chaque utilisateur paie sa propre consommation d'IA chez son fournisseur).

---

## Étape 0 — Ce qu'il vous faut

- Un ordinateur (Mac ou Windows) avec une connexion Internet.
- Un compte Google (pour Firebase).
- Un compte GitHub (gratuit) : <https://github.com/signup>.
- Node.js, version 20 ou plus récente : téléchargez la version « LTS » sur <https://nodejs.org> et installez-la (suivant, suivant, terminer).
- Le dossier `agent-irritants` fourni, avec ce contenu :

```
agent-irritants/
├── public/            (index.html, favicon.svg, css/, js/)
├── firebase.json
├── .firebaserc
├── .gitignore
├── GUIDE.md
└── README.md
```

> **Fichiers cachés.** `.firebaserc` et `.gitignore` commencent par un point : ils sont masqués par défaut.
> Sur Mac, dans le Finder, appuyez sur **Cmd + Maj + .** pour les afficher. Sur Windows, dans l'Explorateur : **Affichage › Afficher › Éléments masqués**.

---

## Étape 1 — Tester l'application sur votre ordinateur (facultatif, 5 min)

1. Ouvrez un terminal :
   - Mac : application **Terminal** (Cmd + Espace, tapez « Terminal »).
   - Windows : **PowerShell** (menu Démarrer, tapez « PowerShell »).
2. Placez-vous dans le dossier (remplacez le chemin par le vôtre ; astuce : tapez `cd ` puis glissez le dossier dans la fenêtre) :

   ```bash
   cd chemin/vers/agent-irritants
   ```

3. Lancez un petit serveur local :

   ```bash
   npx serve public
   ```

   Répondez `y` si on vous demande d'installer `serve`.
4. Ouvrez l'adresse affichée (en général <http://localhost:3000>) dans votre navigateur.
5. Choisissez un fournisseur, collez une clé API, cliquez sur **Tester la clé**, puis **Commencer**.
6. Arrêtez le serveur avec **Ctrl + C** dans le terminal.

> Ouvrir directement `index.html` par un double-clic ne fonctionne pas : le navigateur bloque les scripts ouverts depuis un fichier local. Passez toujours par `npx serve`.

---

## Étape 2 — Mettre les fichiers sur GitHub (10 min)

GitHub conserve vos fichiers et leur historique. Deux méthodes : choisissez-en une.

### Méthode A — Par le site web (la plus simple)

1. Connectez-vous sur <https://github.com>.
2. En haut à droite, cliquez sur **+** › **New repository**.
3. Renseignez :
   - **Repository name** : `agent-irritants`
   - **Visibility** : **Private** (conseillé) ou Public. L'application ne contient aucun secret, les deux sont possibles.
   - Ne cochez **pas** « Add a README file » (vous en avez déjà un).
4. Cliquez sur **Create repository**.
5. Sur la page qui s'affiche, cliquez sur le lien **uploading an existing file**.
6. Affichez les fichiers cachés (voir Étape 0), puis glissez-déposez **tout le contenu** du dossier `agent-irritants` (le dossier `public`, `firebase.json`, `.firebaserc`, `.gitignore`, `GUIDE.md`, `README.md`).
   Vérifiez dans la liste que le dossier `public` apparaît avec ses sous-dossiers `css` et `js`.
7. En bas, dans **Commit changes**, écrivez « Première version » et cliquez sur **Commit changes**.

### Méthode B — Avec Git en ligne de commande

Si Git est installé (`git --version` dans le terminal pour vérifier) :

```bash
cd chemin/vers/agent-irritants
```

```bash
git init -b main
```

```bash
git add .
```

```bash
git commit -m "Première version"
```

Créez le dépôt vide sur GitHub (étapes 1 à 4 de la méthode A), puis copiez l'adresse affichée et lancez (en remplaçant `VOTRE-COMPTE`) :

```bash
git remote add origin https://github.com/VOTRE-COMPTE/agent-irritants.git
```

```bash
git push -u origin main
```

---

## Étape 3 — Créer le projet Firebase (5 min)

1. Allez sur <https://console.firebase.google.com> et connectez-vous avec votre compte Google.
2. Cliquez sur **Créer un projet** (ou **Ajouter un projet**).
3. Donnez-lui un nom, par exemple `resolveur-irritants`. Firebase propose un **identifiant de projet** juste en dessous (par exemple `resolveur-irritants-4f2a1`). **Notez-le**, il servira à l'étape 5 et donnera l'adresse du site.
4. Google Analytics : vous pouvez le désactiver (non utilisé par l'application).
5. Cliquez sur **Créer le projet**, attendez, puis **Continuer**.
6. Dans le menu de gauche : **Créer › Hosting** (ou **Build › Hosting**), puis **Commencer**. Vous pouvez passer les écrans d'explication (les commandes sont détaillées ci-dessous).

Le plan gratuit **Spark** suffit : aucune carte bancaire n'est demandée.

---

## Étape 4 — Installer l'outil Firebase (5 min)

Dans le terminal :

```bash
npm install -g firebase-tools
```

> Sur Mac, si vous obtenez une erreur de permission (`EACCES`), relancez avec `sudo npm install -g firebase-tools` et saisissez le mot de passe de votre session.

Connectez l'outil à votre compte Google (une page s'ouvre dans le navigateur, acceptez) :

```bash
firebase login
```

Vérifiez que votre projet apparaît :

```bash
firebase projects:list
```

---

## Étape 5 — Publier le site (5 min)

1. Ouvrez le fichier `.firebaserc` avec un éditeur de texte (TextEdit, Bloc-notes, VS Code…).
2. Remplacez `REMPLACEZ-PAR-VOTRE-ID-DE-PROJET` par l'identifiant noté à l'étape 3 :

   ```json
   {
     "projects": {
       "default": "resolveur-irritants-4f2a1"
     }
   }
   ```

3. Enregistrez. Dans le terminal, depuis le dossier `agent-irritants` :

   ```bash
   firebase deploy --only hosting
   ```

4. À la fin, Firebase affiche **Hosting URL: https://resolveur-irritants-4f2a1.web.app**. Votre application est en ligne. Ouvrez cette adresse pour vérifier.

> **N'exécutez pas `firebase init hosting`** : la configuration est déjà prête dans `firebase.json`, et cette commande proposerait d'écraser votre `index.html`. Si vous l'avez lancée par erreur, répondez **No** à « Overwrite public/index.html? ».

5. Pensez à reporter la modification de `.firebaserc` sur GitHub : avec la méthode A, ouvrez le fichier sur GitHub, cliquez sur le crayon ✏️, modifiez, puis **Commit changes** ; avec la méthode B :

   ```bash
   git commit -am "Ajout de l'identifiant Firebase"
   ```

   ```bash
   git push
   ```

Pour toute mise à jour future : modifiez les fichiers, puis relancez `firebase deploy --only hosting`.

---

## Étape 6 — Déploiement automatique depuis GitHub (facultatif, 10 min)

Objectif : chaque modification envoyée sur GitHub met le site à jour sans relancer `firebase deploy`.

Prérequis : avoir suivi la méthode B de l'étape 2 (dépôt Git local relié à GitHub).

1. Dans le terminal, depuis le dossier `agent-irritants` :

   ```bash
   firebase init hosting:github
   ```

2. Répondez aux questions :
   - Autoriser l'accès à GitHub : une page s'ouvre, acceptez.
   - **For which GitHub repository would you like to set up a GitHub workflow?** → `VOTRE-COMPTE/agent-irritants`
   - **Set up the workflow to run a build script before every deploy?** → **No** (il n'y a rien à compiler)
   - **Set up automatic deployment to your site's live channel when a PR is merged?** → **Yes**
   - **What is the name of the GitHub branch associated with your site's live channel?** → `main`

   Firebase enregistre automatiquement un secret dans votre dépôt GitHub et crée deux fichiers dans `.github/workflows/`.
3. Envoyez ces fichiers sur GitHub :

   ```bash
   git add .github
   ```

   ```bash
   git commit -m "Déploiement automatique Firebase"
   ```

   ```bash
   git push
   ```

4. Sur GitHub, onglet **Actions** : vous voyez le déploiement s'exécuter. Désormais, chaque `git push` sur `main` (ou chaque modification faite directement sur le site GitHub) publie la nouvelle version.

---

## Étape 7 — Adresse personnalisée (facultatif)

Pour utiliser une adresse comme `irritants.mon-entreprise.fr` : console Firebase › **Hosting** › **Ajouter un domaine personnalisé**, puis suivez les instructions (ajout d'enregistrements DNS chez votre hébergeur de domaine). Le certificat HTTPS est fourni gratuitement.

---

## Étape 8 — Ce que vos utilisateurs doivent faire

Envoyez-leur l'adresse du site et ces consignes.

### 1. Obtenir une clé API

| Fournisseur | Où créer la clé | Remarque |
|---|---|---|
| OpenAI | <https://platform.openai.com/api-keys> | Ajouter un moyen de paiement dans *Billing*. L'abonnement ChatGPT Plus **n'inclut pas** l'API. |
| Anthropic (Claude) | <https://console.anthropic.com/settings/keys> | Acheter des crédits dans *Billing*. L'abonnement Claude.ai **n'inclut pas** l'API. |
| Google (Gemini) | <https://aistudio.google.com/app/apikey> | Offre gratuite avec limites ; vos échanges peuvent alors servir à améliorer les modèles de Google. |
| Mistral AI | <https://console.mistral.ai/api-keys> | Fournisseur français ; offre d'essai disponible. |
| Groq | <https://console.groq.com/keys> | Très rapide, offre gratuite limitée. |
| OpenRouter | <https://openrouter.ai/keys> | Une seule clé pour accéder à des centaines de modèles. |

### 2. Fixer un plafond de dépense

Chez chaque fournisseur, dans la rubrique facturation (*Billing*, *Limits*, *Usage*), définir une limite mensuelle (par exemple 10 €). Une conversation coûte en général quelques centimes.

### 3. Utiliser l'application

1. Ouvrir le site, choisir le fournisseur, coller la clé.
2. Cliquer sur **Tester la clé** : la liste des modèles disponibles apparaît dans le champ **Modèle**. Garder celui proposé par défaut ou en choisir un autre.
3. Indiquer éventuellement son activité (ex. « assistante de direction dans une collectivité ») pour des réponses mieux adaptées.
4. Cocher **Mémoriser ma clé sur cet appareil** uniquement sur un ordinateur personnel.
5. Cliquer sur **Commencer**, décrire l'irritant, répondre aux questions de l'assistant.
6. **Exporter** permet de récupérer la conversation (plan d'action compris) dans un fichier `.md` lisible avec n'importe quel éditeur de texte.

---

## Sécurité et confidentialité : ce qu'il faut savoir

- **La clé ne quitte le navigateur que pour aller chez le fournisseur.** Il n'y a ni serveur ni base de données dans cette application : vous, en tant qu'hébergeur, ne voyez ni les clés ni les conversations.
- **Stockage** : sans la case « Mémoriser », la clé est gardée dans l'onglet et effacée à sa fermeture. Avec la case, elle reste dans le navigateur de l'appareil jusqu'à ce que l'utilisateur la retire (Paramètres › décocher › Commencer) ou vide les données du site.
- **En-têtes de sécurité** : `firebase.json` impose une politique (CSP) qui n'autorise le site à contacter que les six fournisseurs prévus, interdit l'exécution de scripts externes et empêche l'intégration du site dans une autre page.
- **Les réponses de l'IA sont affichées sans exécuter de HTML**, ce qui évite qu'un contenu malveillant s'exécute dans la page.
- **Données sensibles** : rappelez à vos utilisateurs d'anonymiser noms de clients, données personnelles et chiffres confidentiels. Les messages sont traités par le fournisseur choisi selon ses propres conditions (vérifier notamment la politique de conservation des données et la localisation des serveurs si le RGPD est un enjeu ; Mistral AI héberge en Europe).
- **Poste partagé** : ne pas cocher « Mémoriser » sur un ordinateur partagé.

---

## Personnaliser l'agent

| Je veux… | Fichier à modifier |
|---|---|
| Changer la méthode, le ton, les règles de l'assistant | `public/js/prompt.js` (fonction `buildSystemPrompt`) |
| Changer les exemples d'irritants affichés à l'accueil | `public/js/prompt.js` (liste `EXAMPLES`) |
| Changer le modèle proposé par défaut pour un fournisseur | `public/js/providers.js` (`defaultModel`) |
| Changer les couleurs | `public/css/style.css` (variables en haut du fichier, `--accent` notamment) |
| Changer les textes de l'interface | `public/index.html` |

Après chaque modification : `firebase deploy --only hosting` (ou `git push` si l'étape 6 est en place). Si l'ancienne version s'affiche encore, rechargez la page avec **Cmd + Maj + R** (Mac) ou **Ctrl + F5** (Windows).

> **Ajouter un autre fournisseur** : il faut l'ajouter dans `providers.js` **et** ajouter son adresse dans la directive `connect-src` de `firebase.json`, sinon le navigateur bloquera les appels.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| « Clé API invalide ou expirée (HTTP 401) » | Clé mal copiée, révoquée, ou d'un autre fournisseur | Recopier la clé sans espace ; vérifier le fournisseur sélectionné. |
| « Limite d'utilisation atteinte (HTTP 429) » | Crédit épuisé ou trop de requêtes | Recharger le crédit chez le fournisseur ou patienter une minute. |
| « Modèle introuvable » ou HTTP 400/404 | Nom de modèle inexistant ou non accessible avec cette clé | Cliquer sur **Tester la clé** et choisir un modèle de la liste. |
| « Impossible de joindre le fournisseur » | Pas de connexion, réseau d'entreprise filtrant, ou fournisseur refusant les appels depuis un navigateur | Tester sur un autre réseau ; essayer via OpenRouter, qui accepte ces appels pour tous ses modèles. |
| Page blanche après mise en ligne | Dossier `public` mal envoyé ou `firebase.json` absent | Vérifier que `public/index.html` et `public/js/app.js` existent bien ; relancer `firebase deploy --only hosting`. |
| `firebase deploy` : « Invalid project id » | `.firebaserc` non modifié | Remplacer la valeur par l'identifiant exact (`firebase projects:list`). |
| `firebase : command not found` | Outil non installé ou terminal ouvert avant l'installation | Fermer et rouvrir le terminal ; relancer `npm install -g firebase-tools`. |
| L'ancienne version s'affiche | Cache du navigateur | Recharger avec Cmd + Maj + R / Ctrl + F5 (le cache des fichiers est limité à 5 minutes). |
| Ça marche en local mais pas en ligne pour un nouveau fournisseur | Adresse non autorisée dans la CSP | Ajouter le domaine dans `connect-src` de `firebase.json`. |

---

## Aide-mémoire des commandes

```bash
npx serve public
```

```bash
firebase login
```

```bash
firebase deploy --only hosting
```

```bash
firebase hosting:channel:deploy test
```

La dernière commande publie une **version de test** à une adresse temporaire (valable 7 jours) sans toucher au site principal : pratique pour essayer une modification avant de la montrer à vos utilisateurs.
