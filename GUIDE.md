# Guide de mise en ligne pas à pas

Ce guide vous emmène du dossier de fichiers jusqu'à une application en ligne, accessible à vos utilisateurs par une adresse du type `https://votre-projet.web.app`.

**Tout se fait dans le navigateur.** Vous n'installez aucun logiciel et ne tapez aucune commande : vous utilisez uniquement les sites de GitHub, de Firebase et de Google Cloud. GitHub se charge ensuite de publier automatiquement l'application sur Firebase à chaque modification.

Durée : environ 45 minutes la première fois. Coût : 0 € (le plan gratuit « Spark » de Firebase suffit, et GitHub est gratuit ; chaque utilisateur utilise sa propre clé d'IA).

**Fournisseur d'IA retenu : Groq.** L'application propose Groq par défaut, avec le modèle `openai/gpt-oss-120b`. Groq offre une formule gratuite (avec des limites par minute et par jour) et répond très vite. Les autres fournisseurs (OpenAI, Claude, Gemini, Mistral, OpenRouter) restent disponibles dans la liste si un utilisateur en a besoin.

### Comment se déroule une conversation

L'agent est conçu pour que chaque collaborateur fasse remonter un irritant en **5 minutes** :

1. Le collaborateur décrit son irritant en une ou deux phrases.
2. L'assistant reformule et pose **3 questions** : fréquence et temps perdu, personnes et outils concernés, ce qui a déjà été essayé.
3. Après les réponses, il propose **3 solutions** : une **rapide, sans IA** (à faire cette semaine), une **d'organisation** (dans le mois) et une **avec l'IA** (outil, usage concret, exemple de consigne).
4. Il invite le collaborateur à **partager la fiche de son irritant** : un bouton prépare une fiche anonyme, que le collaborateur relit et envoie (étape 10).

### Vue d'ensemble

| Étape | Où | Ce que vous faites |
|---|---|---|
| 1 | Firebase | Créer le projet qui hébergera le site |
| 2 | Google Cloud | Créer la « clé de déploiement » qui autorise GitHub à publier |
| 3 | GitHub | Créer le dépôt qui contiendra les fichiers |
| 4 | GitHub | Enregistrer la clé de déploiement et l'identifiant du projet |
| 5 | GitHub | Déposer les fichiers : la mise en ligne démarre toute seule |
| 6 | Navigateur | Ouvrir l'application et la tester avec Groq |
| 10 | Firebase | *(Facultatif)* Ajouter la base de données des irritants et la page de suivi |

---

## Étape 0 — Ce qu'il vous faut

- Un ordinateur avec un navigateur récent (Chrome, Edge, Firefox ou Safari).
- Un compte Google (pour Firebase et Google Cloud).
- Un compte GitHub (gratuit) : <https://github.com/signup>.
- Une clé API Groq pour vos essais (voir ci-dessous).
- Le dossier `agent-irritants` fourni, avec ce contenu :

```
agent-irritants/
├── .github/
│   └── workflows/
│       └── deploy.yml      (la mise en ligne automatique)
├── public/                 (index.html, favicon.svg, css/, js/)
├── firebase.json
├── firestore.rules         (règles de la base de données, étape 10)
├── .gitignore
├── GUIDE.md
├── Guide-mise-en-ligne.pdf
└── README.md
```

> **Fichiers cachés.** Le dossier `.github` et le fichier `.gitignore` commencent par un point : ils sont masqués par défaut.
> Sur Mac, dans le Finder, appuyez sur **Cmd + Maj + .** pour les afficher. Sur Windows, dans l'Explorateur : **Affichage › Afficher › Éléments masqués**.
> Le dossier `.github` est indispensable : c'est lui qui déclenche la mise en ligne.

### Créer votre clé API Groq (5 min)

1. Allez sur <https://console.groq.com> et connectez-vous (compte Google, GitHub ou adresse e-mail). L'inscription est gratuite.
2. Dans le menu, ouvrez **API Keys** (accès direct : <https://console.groq.com/keys>).
3. Cliquez sur **Create API Key**, donnez-lui un nom (par exemple `resolveur-irritants`) et validez.
4. **Copiez la clé immédiatement** (elle commence par `gsk_`) et rangez-la dans un endroit sûr, par exemple votre gestionnaire de mots de passe : Groq ne l'affichera plus ensuite. Si vous la perdez, supprimez-la et créez-en une nouvelle.

> **Une clé = une personne.** Chaque utilisateur de l'application crée sa propre clé Groq (voir Étape 9). La clé Groq n'est **jamais** déposée sur GitHub ni dans Firebase : chacun la saisit dans l'application.

---

## Étape 1 — Créer le projet Firebase (5 min)

1. Allez sur <https://console.firebase.google.com> et connectez-vous avec votre compte Google.
2. Cliquez sur **Créer un projet** (ou **Ajouter un projet**).
3. Donnez-lui un nom, par exemple `resolveur-irritants`. Firebase affiche juste en dessous un **identifiant de projet** (par exemple `resolveur-irritants-4f2a1`).
   **Notez cet identifiant exactement** : il servira à l'étape 4 et formera l'adresse de votre site.
4. Google Analytics : vous pouvez le désactiver (l'application ne l'utilise pas).
5. Cliquez sur **Créer le projet**, attendez, puis **Continuer**.
6. Dans le menu de gauche, ouvrez **Créer › Hosting** (ou **Build › Hosting**), puis cliquez sur **Commencer**.
   Firebase affiche des écrans d'explication avec des commandes à taper : **ignorez-les** et cliquez sur **Suivant** jusqu'à la fin, puis **Continuer vers la console**. Cette étape active l'hébergement de votre projet ; les commandes, elles, sont remplacées par GitHub.
7. **Activez l'API Firebase Hosting** (indispensable pour publier depuis GitHub) : ouvrez <https://console.cloud.google.com/apis/library/firebasehosting.googleapis.com>, vérifiez en haut que votre projet est bien sélectionné, puis cliquez sur **Activer**. Si le bouton affiche **Gérer**, l'API est déjà active.

> **Retrouver l'identifiant plus tard** : dans la console Firebase, roue dentée ⚙️ en haut à gauche › **Paramètres du projet** › ligne **ID du projet**.

Le plan gratuit **Spark** suffit : aucune carte bancaire n'est demandée.

---

## Étape 2 — Créer la clé de déploiement (10 min)

GitHub a besoin d'une autorisation pour publier sur votre projet Firebase. Cette autorisation prend la forme d'un **compte de service** (un « utilisateur robot ») et de sa clé, un petit fichier `.json`. Tout se passe dans la console Google Cloud, qui gère votre projet Firebase en coulisses.

### 2.1 Créer le compte de service

1. Ouvrez <https://console.cloud.google.com/iam-admin/serviceaccounts> (même compte Google que pour Firebase).
2. En haut de la page, dans le sélecteur de projet, choisissez **le projet qui porte le nom de votre projet Firebase** (par exemple `resolveur-irritants`).
3. Cliquez sur **+ Créer un compte de service**.
4. **Nom du compte de service** : `github-deploiement`. L'identifiant se remplit tout seul. Cliquez sur **Créer et continuer**.
5. **Accorder à ce compte de service l'accès au projet** : ajoutez ces trois rôles, un par un, avec **+ Ajouter un autre rôle** (tapez le nom dans le champ de recherche) :
   - **Administrateur Firebase Hosting** (*Firebase Hosting Admin*) : publier le site ;
   - **Lecteur de clés API** (*API Keys Viewer*) : requis par l'outil de publication ;
   - **Lecteur Cloud Run** (*Cloud Run Viewer*) : requis par l'outil de publication.

   > **Vous ne trouvez pas « API Keys Viewer » ?** Il est rangé dans la catégorie **Service Usage**, et son nom peut différer selon la langue. À la place, ajoutez le rôle **Lecteur** (*Viewer*), dans la catégorie **Basique** : il donne un accès en lecture seule au projet, ce qui couvre ce besoin.
6. Cliquez sur **Continuer**, puis **OK** (l'étape « Autoriser les utilisateurs… » reste vide).

### 2.2 Télécharger la clé du compte de service

1. Dans la liste, cliquez sur le compte `github-deploiement` que vous venez de créer.
2. Ouvrez l'onglet **Clés**.
3. Cliquez sur **Ajouter une clé › Créer une clé**, choisissez **JSON**, puis **Créer**.
4. Un fichier `.json` se télécharge sur votre ordinateur. Gardez-le à portée de main pour l'étape 4.

> **Ce fichier est un secret.** Il permet de publier n'importe quoi sur votre site. Ne l'envoyez à personne, ne le déposez pas dans les fichiers du dépôt GitHub (seulement dans les « secrets », étape 4), et **supprimez-le de votre ordinateur** une fois l'étape 4 terminée. En cas de doute, supprimez la clé dans l'onglet **Clés** et créez-en une nouvelle.

> **« La création de clés de compte de service est désactivée »** : si ce message apparaît, votre compte Google dépend d'une organisation (entreprise, collectivité, école) qui interdit ces clés. Demandez à votre service informatique d'autoriser la création de la clé pour ce projet, ou utilisez un compte Google personnel pour héberger l'application.

---

## Étape 3 — Créer le dépôt GitHub (3 min)

1. Connectez-vous sur <https://github.com>.
2. En haut à droite, cliquez sur **+** › **New repository**.
3. Renseignez :
   - **Repository name** : `agent-irritants`
   - **Visibility** : **Private** (conseillé) ou Public. Les fichiers de l'application ne contiennent aucun secret, les deux sont possibles.
   - Ne cochez **pas** « Add a README file » : le dépôt doit rester vide pour l'instant.
4. Cliquez sur **Create repository**. Laissez cette page ouverte.

---

## Étape 4 — Enregistrer les accès dans GitHub (5 min)

On donne à GitHub la clé de déploiement (en secret chiffré) et l'identifiant du projet Firebase, **avant** de déposer les fichiers.

### 4.1 Le secret : la clé de déploiement

1. Dans votre dépôt, cliquez sur l'onglet **Settings** (Paramètres), tout à droite.
2. Dans le menu de gauche : **Secrets and variables › Actions**.
3. Onglet **Secrets**, cliquez sur **New repository secret**.
4. **Name** : `FIREBASE_SERVICE_ACCOUNT` (exactement, en majuscules).
5. **Secret** : ouvrez le fichier `.json` téléchargé à l'étape 2 avec un éditeur de texte (Bloc-notes, TextEdit), sélectionnez **tout** son contenu (Ctrl + A ou Cmd + A), copiez-le et collez-le ici. Le texte commence par `{` et se termine par `}`.
6. Cliquez sur **Add secret**. GitHub le chiffre : personne, pas même vous, ne pourra plus le lire.
7. Supprimez maintenant le fichier `.json` de votre ordinateur (et videz la corbeille).

### 4.2 La variable : l'identifiant du projet

1. Toujours dans **Secrets and variables › Actions**, ouvrez l'onglet **Variables**.
2. Cliquez sur **New repository variable**.
3. **Name** : `FIREBASE_PROJECT_ID`
4. **Value** : l'identifiant noté à l'étape 1 (par exemple `resolveur-irritants-4f2a1`), sans espace.
5. Cliquez sur **Add variable**.

---

## Étape 5 — Déposer les fichiers : la mise en ligne démarre (10 min)

1. Revenez sur la page d'accueil du dépôt (onglet **Code**). Cliquez sur le lien **uploading an existing file** (ou **Add file › Upload files**).
2. Affichez les fichiers cachés (voir Étape 0), ouvrez le dossier `agent-irritants` et glissez-déposez **tout son contenu** dans la page : le dossier `.github`, le dossier `public`, `firebase.json`, `firestore.rules`, `.gitignore`, `GUIDE.md`, `Guide-mise-en-ligne.pdf`, `README.md`.
3. Vérifiez la liste affichée : on doit y voir `.github/workflows/deploy.yml` ainsi que `public/index.html`, `public/css/style.css` et les six fichiers de `public/js/`.
4. En bas, dans **Commit changes**, écrivez « Première version » et cliquez sur **Commit changes**.

GitHub lance aussitôt la mise en ligne. Pour la suivre :

5. Ouvrez l'onglet **Actions** du dépôt. Une ligne **Mise en ligne sur Firebase** apparaît avec un rond orange (en cours).
6. Au bout d'une à deux minutes, le rond devient une **coche verte** ✅ : votre site est en ligne.
   En cas de **croix rouge** ❌, cliquez sur la ligne pour lire l'erreur et reportez-vous au **Dépannage** en fin de guide.

> **Le dossier `.github` n'apparaît pas après le dépôt ?** Certains navigateurs ignorent les dossiers cachés lors d'un glisser-déposer. Créez alors le fichier directement sur GitHub :
> 1. **Add file › Create new file**.
> 2. Dans le champ du nom, tapez exactement `.github/workflows/deploy.yml` (les `/` créent les dossiers).
> 3. Collez le contenu ci-dessous, puis **Commit changes**.
>
> **Important :** copiez ce code depuis le fichier `GUIDE.md` ou depuis `deploy.yml`, **jamais depuis le PDF** : le PDF supprime les espaces en début de ligne, et GitHub refuse alors le fichier (« Invalid workflow file »).

```yaml
name: Mise en ligne sur Firebase

# Publie le site sur Firebase Hosting à chaque modification de la branche main,
# ou à la demande depuis l'onglet Actions (bouton « Run workflow »).
# En cas de problème, l'explication s'affiche en français dans le cadre
# « Annotations » de la page de résumé, sans avoir à ouvrir le journal.

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SA: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
      PROJECT: ${{ vars.FIREBASE_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4

      - name: Verifier les reglages
        run: |
          # Retire les espaces et retours à la ligne invisibles collés par erreur
          PROJECT=$(printf '%s' "$PROJECT" | tr -d '[:space:]')
          ok=1
          if [ -z "$SA" ]; then
            echo "::error title=Secret manquant::Le secret FIREBASE_SERVICE_ACCOUNT est absent ou vide. Ajoutez-le dans Settings > Secrets and variables > Actions > onglet Secrets (etape 4.1 du guide)."
            ok=0
          elif ! printf '%s' "$SA" | jq -e '.client_email and .private_key' >/dev/null 2>&1; then
            echo "::error title=Secret incomplet::Le secret FIREBASE_SERVICE_ACCOUNT ne contient pas une cle JSON complete. Recreez-le en collant TOUT le fichier .json, du premier { au dernier } (etape 4.1 du guide)."
            ok=0
          fi
          if [ -z "$PROJECT" ]; then
            echo "::error title=Variable manquante::La variable FIREBASE_PROJECT_ID est absente ou vide. Ajoutez-la dans Settings > Secrets and variables > Actions > onglet Variables (etape 4.2 du guide)."
            ok=0
          fi
          if [ "$ok" = 1 ]; then
            KEY_PROJECT=$(printf '%s' "$SA" | jq -r '.project_id')
            KEY_EMAIL=$(printf '%s' "$SA" | jq -r '.client_email')
            echo "Cle de deploiement : $KEY_EMAIL (projet $KEY_PROJECT)"
            echo "Projet vise : $PROJECT"
            if [ "$KEY_PROJECT" != "$PROJECT" ]; then
              echo "::error title=Projets differents::La cle de deploiement appartient au projet « $KEY_PROJECT » mais la variable FIREBASE_PROJECT_ID vaut « $PROJECT ». Corrigez la variable avec l'identifiant exact du projet Firebase."
              ok=0
            fi
          fi
          [ "$ok" = 1 ]

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Publier sur Firebase Hosting
        run: |
          PROJECT=$(printf '%s' "$PROJECT" | tr -d '[:space:]')
          printf '%s' "$SA" > "$RUNNER_TEMP/cle.json"
          export GOOGLE_APPLICATION_CREDENTIALS="$RUNNER_TEMP/cle.json"
          # Précise le site à publier : le site par défaut porte le même nom que le projet
          jq --arg site "$PROJECT" '.hosting.site = (.hosting.site // $site)' firebase.json > "$RUNNER_TEMP/firebase.json"
          cp "$RUNNER_TEMP/firebase.json" firebase.json
          set +e
          npx --yes firebase-tools@latest deploy --only hosting --project "$PROJECT" --non-interactive 2>&1 | tee "$RUNNER_TEMP/sortie.txt"
          code=${PIPESTATUS[0]}
          rm -f "$RUNNER_TEMP/cle.json"
          if [ "$code" -ne 0 ]; then
            if grep -qiE 'no site name|site.*not found|entity was not found' "$RUNNER_TEMP/sortie.txt"; then
              echo "::error title=Hebergement non active::Le site $PROJECT n'existe pas encore. Ouvrez la console Firebase, rubrique Hosting, cliquez sur Commencer (Get started) et allez jusqu'au bout des ecrans, puis relancez la mise en ligne."
            fi
            detail=$(grep -iE 'error|erreur|denied|permission|not found|unable|403|404|invalid|failed' "$RUNNER_TEMP/sortie.txt" | tail -n 8 | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')
            if [ -z "$detail" ]; then
              detail="Aucun detail : ouvrez le journal de cette etape."
            fi
            echo "::error title=Echec de la mise en ligne::$detail"
            exit "$code"
          fi
          echo "::notice title=Site en ligne::https://$PROJECT.web.app"
```

> **Relancer la mise en ligne à la main** : onglet **Actions** › **Mise en ligne sur Firebase** (menu de gauche) › bouton **Run workflow** › **Run workflow**. Utile après avoir corrigé un secret ou une variable.

---

## Étape 6 — Ouvrir et tester l'application (5 min)

1. Votre application est à l'adresse **`https://VOTRE-ID-DE-PROJET.web.app`** (par exemple `https://resolveur-irritants-4f2a1.web.app`). L'adresse `https://VOTRE-ID-DE-PROJET.firebaseapp.com` fonctionne aussi.
   Vous la retrouvez aussi dans la console Firebase, rubrique **Hosting**.
2. Ouvrez-la : l'écran « Résolveur d'irritants » s'affiche, avec **Groq** déjà sélectionné.
3. Collez votre clé `gsk_…`, cliquez sur **Tester la clé** : le message « Clé valide » doit apparaître.
4. Cliquez sur **Commencer**, puis sur l'un des exemples d'irritants. L'assistant doit répondre en quelques secondes avec **3 questions**. Répondez-y : il propose alors **3 solutions**.
5. Ajoutez l'adresse à vos favoris et partagez-la avec vos utilisateurs.

---

## Étape 7 — Modifier l'application plus tard

Toute modification enregistrée sur GitHub est publiée automatiquement en une à deux minutes.

1. Dans le dépôt, naviguez jusqu'au fichier à modifier (par exemple `public/js/prompt.js`).
2. Cliquez sur l'icône crayon ✏️ (**Edit this file**).
3. Faites votre modification, puis cliquez sur **Commit changes…** › **Commit changes**.
4. Suivez la publication dans l'onglet **Actions** (coche verte = en ligne).
5. Rechargez l'application avec **Ctrl + F5** (Windows) ou **Cmd + Maj + R** (Mac) pour voir la nouvelle version.

> **Revenir en arrière** : chaque modification est conservée dans l'historique du fichier (bouton **History**). Vous pouvez y recopier une ancienne version et l'enregistrer.

---

## Étape 8 — Adresse personnalisée (facultatif)

Pour utiliser une adresse comme `irritants.mon-entreprise.fr` : console Firebase › **Hosting** › **Ajouter un domaine personnalisé**, puis suivez les instructions (ajout d'enregistrements DNS chez le gestionnaire de votre nom de domaine). Le certificat HTTPS est fourni gratuitement.

---

## Étape 9 — Ce que vos utilisateurs doivent faire

Envoyez-leur l'adresse du site et ces consignes.

### 1. Créer sa clé Groq

Chaque utilisateur suit la procédure « Créer votre clé API Groq » de l'Étape 0 : compte gratuit sur <https://console.groq.com>, puis **API Keys › Create API Key**, et copie de la clé `gsk_…` dès sa création.

### 2. Comprendre les limites de Groq

- **Formule gratuite** : pas de carte bancaire, mais un nombre limité de requêtes et de « tokens » (morceaux de texte) **par minute et par jour**. À titre indicatif, pour `openai/gpt-oss-120b` : environ 30 requêtes et 8 000 tokens par minute, 1 000 requêtes par jour. Les valeurs à jour de votre compte se trouvent dans la console Groq, rubrique **Settings › Limits**.
- **En pratique** : une conversation normale tient sans problème. Les limites se font sentir si l'on enchaîne les messages très vite ou si la conversation devient très longue (tout l'historique est renvoyé à chaque message). Dans ce cas : patienter une minute, ou cliquer sur **Nouvelle conversation** après avoir exporté la précédente.
- **Formule payante (Developer)** : limites beaucoup plus élevées, facturation à l'usage (quelques centimes par conversation). Si vous l'activez, fixez un plafond de dépense dans les réglages de facturation de la console Groq.

### 3. Choisir le modèle

Le champ **Modèle** propose `openai/gpt-oss-120b` par défaut. Après **Tester la clé**, la liste affiche tous les modèles de conversation disponibles pour la clé.

| Modèle | Usage conseillé |
|---|---|
| `openai/gpt-oss-120b` | **Recommandé.** Le plus solide pour analyser un irritant et construire un plan d'action. |
| `openai/gpt-oss-20b` | Plus léger et plus rapide ; bon compromis si les limites de la formule gratuite gênent. |
| `llama-3.3-70b-versatile` | Alternative fiable, bonne qualité de rédaction en français. |
| `llama-3.1-8b-instant` | Très rapide mais moins précis : pour des échanges simples. |
| `qwen/qwen3.8-27b` | Modèle « en préversion » chez Groq : il peut disparaître sans préavis. |

> Les modèles évoluent régulièrement chez Groq. Si un modèle renvoie « Modèle introuvable », cliquez sur **Tester la clé** et choisissez-en un dans la liste à jour.

### 4. Utiliser l'application

1. Ouvrir le site : **Groq** est déjà sélectionné. Coller sa clé `gsk_…`.
2. Cliquer sur **Tester la clé** : le message « Clé valide » apparaît et la liste des modèles se remplit dans le champ **Modèle**. Garder celui proposé par défaut ou en choisir un autre.
3. Indiquer éventuellement son activité (ex. « assistante de direction dans une collectivité ») pour des réponses mieux adaptées.
4. Cocher **Mémoriser ma clé sur cet appareil** uniquement sur un ordinateur personnel.
5. Cliquer sur **Commencer**, décrire l'irritant en une ou deux phrases, puis répondre aux **3 questions** de l'assistant (un seul message suffit).
6. Lire les **3 solutions** proposées, puis cliquer sur **Partager mon irritant** pour faire remonter la fiche.
7. **Exporter** permet de récupérer la conversation (plan d'action compris) dans un fichier `.md` lisible avec n'importe quel éditeur de texte.

### 5. Autres fournisseurs (si besoin)

L'application accepte aussi d'autres fournisseurs, à choisir dans la liste **Fournisseur d'IA** :

| Fournisseur | Où créer la clé | Remarque |
|---|---|---|
| OpenAI | <https://platform.openai.com/api-keys> | Payant à l'usage. L'abonnement ChatGPT Plus **n'inclut pas** l'API. |
| Anthropic (Claude) | <https://console.anthropic.com/settings/keys> | Payant à l'usage. L'abonnement Claude.ai **n'inclut pas** l'API. |
| Google (Gemini) | <https://aistudio.google.com/app/apikey> | Offre gratuite avec limites ; les échanges peuvent alors servir à améliorer les modèles de Google. |
| Mistral AI | <https://console.mistral.ai/api-keys> | Fournisseur français, hébergement en Europe. |
| OpenRouter | <https://openrouter.ai/keys> | Une seule clé pour accéder à des centaines de modèles. |

---

## Étape 10 — Base de données des irritants et boucle retour (25 min, facultatif)

Cette étape ajoute deux choses :

- **Pour vos utilisateurs** : sous les 3 solutions proposées par l'assistant, un bouton **« Partager mon irritant »**. L'IA résume la conversation en une **fiche anonyme** (catégorie, résumé, mots-clés, fréquence, impact et les 3 solutions). L'utilisateur la relit, la corrige, indique la solution qui lui paraît la plus utile, coche la case d'accord et l'envoie. Il peut laisser son e-mail s'il veut être prévenu du traitement.
- **Pour vous** : une **page de suivi** réservée à votre compte Google, à l'adresse `https://VOTRE-ID-DE-PROJET.web.app/suivi`. Vous y voyez toutes les fiches, les catégories et mots-clés les plus cités, vous changez le statut de chaque fiche (Nouveau, En analyse, Action en cours, Traité, Écarté), vous notez l'action menée et vous exportez le tout vers Excel.

Les fiches sont enregistrées dans **Firestore**, la base de données de Firebase, dans le même projet. Le plan gratuit suffit (20 000 fiches envoyées et 50 000 lectures par jour). Tant que cette étape n'est pas faite, le bouton de partage reste simplement caché.

### 10.1 Créer la base de données

1. Console Firebase › votre projet › menu de gauche **Créer › Firestore Database** (*Build › Firestore Database*) › **Créer une base de données**.
2. Si Firebase demande une **édition**, choisissez **Standard**. Laissez l'identifiant de la base à `(default)`.
3. **Emplacement** : choisissez une région **en Europe**, par exemple **`eur3 (Europe)`** ou **`europe-west9 (Paris)`**. ⚠️ Ce choix est **définitif** et compte pour le RGPD.
4. **Règles de sécurité** : choisissez **Démarrer en mode production** (tout est fermé ; vous collerez les vraies règles à l'étape 10.4). Cliquez sur **Créer**.

### 10.2 Activer la connexion Google (pour votre page de suivi)

1. Menu de gauche **Créer › Authentication** › **Commencer**.
2. Onglet **Mode de connexion** (*Sign-in method*) › **Google** › activez l'interrupteur, choisissez votre adresse e-mail d'assistance › **Enregistrer**.
3. Onglet **Paramètres** (*Settings*) › **Domaines autorisés** : `VOTRE-ID-DE-PROJET.web.app` et `VOTRE-ID-DE-PROJET.firebaseapp.com` y figurent déjà. Si vous avez un **nom de domaine personnalisé** (étape 8), cliquez sur **Ajouter un domaine** et saisissez-le (par exemple `irritants.mon-entreprise.fr`).

### 10.3 Déclarer l'application Web

1. Roue dentée ⚙️ en haut à gauche › **Paramètres du projet** › onglet **Général**.
2. Tout en bas, section **Vos applications**, cliquez sur l'icône **`</>`** (Web).
3. **Surnom de l'application** : `resolveur-irritants`. Ne cochez **pas** « Configurer également Firebase Hosting ». Cliquez sur **Enregistrer l'application**.
4. Firebase affiche un bloc de code : **vous n'avez rien à copier**. Cliquez sur **Continuer vers la console**. L'application récupère cette configuration toute seule.

### 10.4 Coller les règles de sécurité

Les règles protègent la base : **tout le monde peut déposer une fiche, mais personne ne peut les lire, sauf vous.**

1. Sur votre ordinateur, ouvrez le fichier **`firestore.rules`** du dossier `agent-irritants` avec un éditeur de texte (Mac : clic droit › **Ouvrir avec › TextEdit** ; Windows : clic droit › **Ouvrir avec › Bloc-notes**). Sélectionnez tout et copiez.
2. Console Firebase › **Firestore Database** › onglet **Règles**. Effacez tout le contenu affiché, puis collez.
3. Dans le texte collé, repérez `'VOTRE-ADRESSE@gmail.com'` et remplacez-le par **l'adresse de votre compte Google**, **en minuscules**, en gardant les apostrophes. Exemple : `'marie.dupont@gmail.com'`.
   Pour autoriser plusieurs personnes : `['marie.dupont@gmail.com', 'paul.martin@gmail.com']`.
4. Cliquez sur **Publier**. Si un message rouge apparaît, vérifiez les apostrophes autour de l'adresse.

> **Vous aviez déjà collé les règles ?** Recollez-les : le fichier `firestore.rules` a changé avec la nouvelle fiche (3 solutions et solution préférée). Sinon, l'envoi des fiches est refusé.

> Faites ce remplacement **uniquement dans la console**, pas dans le fichier `firestore.rules` déposé sur GitHub : ainsi votre adresse n'apparaît pas dans le dépôt.

### 10.5 Déposer les nouveaux fichiers sur GitHub

1. Dans votre dépôt GitHub (onglet **Code**), cliquez sur **Add file › Upload files**.
2. Glissez-déposez depuis le dossier `agent-irritants` : le dossier **`public`** entier, **`firebase.json`**, **`firestore.rules`**, **`GUIDE.md`**, **`Guide-mise-en-ligne.pdf`** et **`README.md`**. Les fichiers existants sont remplacés.
3. Cliquez sur **Commit changes**, puis attendez la **coche verte** dans l'onglet **Actions**.

### 10.6 Compléter la page de confidentialité

Le RGPD impose d'informer les utilisateurs. La page `confidentialite.html` est prête ; il reste deux informations à compléter.

1. Sur GitHub, ouvrez `public/confidentialite.html` › crayon ✏️.
2. Remplacez **`[Nom de votre organisation]`** (crochets compris) par le nom de votre structure, et **`[adresse e-mail de contact]`** par l'adresse à laquelle les utilisateurs peuvent exercer leurs droits.
3. La durée de conservation est fixée à **24 mois** : modifiez-la si votre organisation a une autre règle.
4. **Commit changes**.

### 10.7 Tester

1. Ouvrez l'application (rechargez avec **Cmd + Maj + R** ou **Ctrl + F5**), décrivez un irritant et attendez la réponse.
2. Répondez aux 3 questions. Sous les 3 solutions, cliquez sur **Partager mon irritant**. Après quelques secondes, la fiche se remplit. Relisez-la, cochez la case d'accord, cliquez sur **Envoyer la fiche** : le message « Merci ! » s'affiche.
3. Ouvrez **`https://VOTRE-ID-DE-PROJET.web.app/suivi`** (ou `/suivi` derrière votre nom de domaine) et ajoutez-la à vos favoris.
4. Cliquez sur **Se connecter avec Google**, choisissez le compte indiqué dans les règles : la fiche apparaît.

### 10.8 Faire vivre la boucle retour

| Statut | Signification |
|---|---|
| **Nouveau** | Fiche reçue, pas encore regardée |
| **En analyse** | Vous étudiez l'irritant, vous le rapprochez d'autres fiches |
| **Action en cours** | Une solution est lancée |
| **Traité** | L'irritant est résolu |
| **Écarté** | Hors périmètre ou non retenu (expliquez pourquoi dans le commentaire) |

Une routine simple, par exemple chaque mois :

1. Cliquez sur **Nouveau** pour voir les fiches arrivées.
2. Regardez le tableau **Catégories**, la **solution jugée la plus utile** (elle montre où l'IA est attendue) et les **Mots-clés les plus cités** : cliquez sur un mot-clé pour regrouper les fiches qui se ressemblent.
3. Décidez des actions, passez les fiches au bon statut et notez l'action dans **Votre commentaire**, puis **Enregistrer**.
4. Quand une fiche est **Traitée**, cliquez sur l'adresse e-mail (si l'utilisateur en a laissé une) pour le prévenir : c'est ce qui boucle la boucle.
5. **Exporter (Excel)** produit un fichier à ouvrir dans Excel pour vos comités ou vos bilans (l'export respecte les filtres affichés).
6. Supprimez les fiches de plus de 24 mois (bouton **Supprimer**), comme annoncé dans la page de confidentialité.

---

## Sécurité et confidentialité : ce qu'il faut savoir

- **La clé Groq ne quitte le navigateur que pour aller chez Groq.** Vous, en tant qu'hébergeur, ne voyez ni les clés ni les conversations. Seules les **fiches anonymes** que les utilisateurs choisissent de partager sont enregistrées (Étape 10).
- **Base de données** : les règles de sécurité n'autorisent que le dépôt de fiches complètes et de taille limitée. Personne ne peut lire, modifier ou supprimer une fiche, sauf les comptes Google inscrits dans les règles.
- **Stockage** : sans la case « Mémoriser », la clé est gardée dans l'onglet et effacée à sa fermeture. Avec la case, elle reste dans le navigateur de l'appareil jusqu'à ce que l'utilisateur la retire (Paramètres › décocher › Commencer) ou vide les données du site.
- **Clé de déploiement** : le compte de service `github-deploiement` ne sert qu'à publier le site. Il est rangé dans les secrets chiffrés de GitHub. Si vous pensez qu'il a fuité, supprimez sa clé dans Google Cloud (onglet **Clés**), créez-en une nouvelle et remplacez le secret `FIREBASE_SERVICE_ACCOUNT`.
- **Accès au dépôt** : toute personne ayant le droit de modifier le dépôt GitHub peut modifier le site. N'invitez que des personnes de confiance (**Settings › Collaborators**).
- **En-têtes de sécurité** : `firebase.json` impose une politique (CSP) qui n'autorise le site à contacter que les six fournisseurs prévus et les services Firebase (base de données, connexion Google), interdit l'exécution de scripts venant d'autres sites et empêche l'intégration du site dans une autre page.
- **Les réponses de l'IA sont affichées sans exécuter de HTML**, ce qui évite qu'un contenu malveillant s'exécute dans la page.
- **Données sensibles** : rappelez à vos utilisateurs d'anonymiser noms de clients, données personnelles et chiffres confidentiels. Les messages sont traités par Groq (ou le fournisseur choisi) selon ses propres conditions : consultez la politique de confidentialité et de conservation des données de Groq (<https://groq.com/privacy-policy>) et vérifiez la localisation des serveurs si le RGPD est un enjeu pour votre organisation.
- **Poste partagé** : ne pas cocher « Mémoriser » sur un ordinateur partagé.

---

## Personnaliser l'agent

Toutes ces modifications se font sur GitHub avec le crayon ✏️ (voir Étape 7).

| Je veux… | Fichier à modifier |
|---|---|
| Changer les 3 questions, les 3 types de solutions, le ton | `public/js/prompt.js` (fonction `buildSystemPrompt`) |
| Changer les exemples d'irritants affichés à l'accueil | `public/js/prompt.js` (liste `EXAMPLES`) |
| Changer le modèle Groq proposé par défaut | `public/js/providers.js` (bloc `groq`, ligne `defaultModel`) |
| Proposer un autre fournisseur par défaut | `public/js/providers.js` : le premier bloc de la liste est celui sélectionné à l'ouverture |
| Changer les couleurs | `public/css/style.css` (variables en haut du fichier) |
| Changer les textes de l'interface | `public/index.html` |
| Changer les catégories des fiches | `public/js/prompt.js` (liste `CATEGORIES`) |
| Changer la façon dont l'IA résume la fiche | `public/js/prompt.js` (fonction `buildFichePrompt`) |
| Compléter la page de confidentialité | `public/confidentialite.html` (étape 10.6) |

> **Ajouter un autre fournisseur** : il faut l'ajouter dans `providers.js` **et** ajouter son adresse dans la directive `connect-src` de `firebase.json`, sinon le navigateur bloquera les appels.

---

## Dépannage

### La mise en ligne échoue (croix rouge dans l'onglet Actions)

Sur la page de la mise en ligne en échec, regardez le cadre **Annotations** : il explique le problème **en français** (secret manquant, variable manquante, projets différents…) et indique quoi corriger. Si l'annotation affiche un message technique en anglais, cherchez-le dans le tableau ci-dessous.

| Message ou symptôme | Cause probable | Solution |
|---|---|---|
| `Input required and not supplied: firebaseServiceAccount` | Secret absent ou mal nommé | Étape 4.1 : le nom doit être exactement `FIREBASE_SERVICE_ACCOUNT`. Puis **Run workflow**. |
| `Failed to authenticate` ou JSON invalide | Contenu du secret incomplet | Recréer le secret en collant **tout** le fichier `.json`, de `{` à `}`. |
| `No project active` ou projet introuvable | Variable absente, mal nommée ou erronée | Étape 4.2 : nom `FIREBASE_PROJECT_ID`, valeur = identifiant exact du projet (Paramètres du projet Firebase). |
| `HTTP Error: 403` ou `permission denied` | Rôles manquants sur le compte de service | Google Cloud › **IAM et administration › IAM** › crayon à côté de `github-deploiement` : vérifier les trois rôles de l'étape 2.1. |
| `Failed to get Firebase project` | Le compte de service n'a pas les droits de lecture du projet | Google Cloud › **IAM** › crayon à côté de `github-deploiement` : vérifier **Administrateur Firebase Hosting** et ajouter **Lecteur** (*Viewer*). Puis **Run workflow**. |
| `Unable to enable firebasehosting.googleapis.com` | API Firebase Hosting non activée | Étape 1, point 7 : ouvrir le lien et cliquer sur **Activer**. Puis **Run workflow**. |
| `resolving hosting target of a site with no site name` ou « Hébergement non activé » | Hosting pas encore initialisé dans Firebase | Console Firebase › **Hosting** › **Commencer** jusqu'au bout des écrans, puis **Run workflow**. |
| `Hosting site not found` ou `404` | Hosting pas encore activé | Console Firebase › **Hosting** › **Commencer** (étape 1, point 6), puis **Run workflow**. |
| `Invalid workflow file` avec « Unexpected value » | Espaces de début de ligne perdus dans `deploy.yml` (copié depuis le PDF) | Remplacer le fichier : ouvrir `.github/workflows`, **Add file › Upload files**, déposer le `deploy.yml` du dossier fourni. |
| Aucune ligne dans l'onglet Actions | Fichier `.github/workflows/deploy.yml` absent | Le créer depuis GitHub (encadré de l'étape 5). |
| Bandeau « Workflows aren't being run on this repository » | Actions désactivées sur le dépôt | Cliquer sur le bouton proposé pour les activer, ou **Settings › Actions › General › Allow all actions**. |

### L'application est en ligne mais quelque chose cloche

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page « Site Not Found » de Firebase | Première publication pas encore terminée ou en échec | Vérifier la coche verte dans **Actions** ; patienter quelques minutes. |
| Page blanche | Dossier `public` incomplet sur GitHub | Vérifier que `public/index.html` et les fichiers de `public/js/` sont bien dans le dépôt. |
| « Clé API invalide » avec Groq | Clé ne commençant pas par `gsk_`, ou clé supprimée dans la console | Vérifier dans <https://console.groq.com/keys> que la clé existe ; sinon en créer une nouvelle. |
| « Limite d'utilisation atteinte (HTTP 429) » | Limite par minute ou par jour de la formule gratuite Groq dépassée | Patienter une minute (ou jusqu'au lendemain pour la limite journalière) ; passer à `openai/gpt-oss-20b` ou à la formule Developer. |
| « Conversation trop longue… (HTTP 413) » | L'historique envoyé dépasse la limite de tokens par minute de la formule gratuite | Exporter la conversation, puis cliquer sur **Nouvelle conversation** en résumant l'essentiel. |
| « Modèle introuvable » ou HTTP 400/404 | Nom de modèle inexistant ou retiré | Cliquer sur **Tester la clé** et choisir un modèle de la liste. |
| « Impossible de joindre le fournisseur » | Pas de connexion ou réseau d'entreprise filtrant | Tester sur un autre réseau (par exemple le partage de connexion du téléphone) ; sinon demander au service informatique d'autoriser `api.groq.com`. |
| Le bouton « Partager mon irritant » n'apparaît pas | Application Web non déclarée, ou ancienne version en cache | Étape 10.3 ; puis recharger avec Ctrl + F5 / Cmd + Maj + R. Le bouton n'apparaît qu'après la réponse contenant les 3 solutions. |
| « La fiche n'a pas pu être préparée automatiquement » | Limite Groq atteinte ou réponse illisible du modèle | Remplir la fiche à la main, ou patienter une minute et recommencer. |
| « La base de données n'est pas encore créée » | Firestore pas créé | Étape 10.1. |
| « Accès refusé par les règles de sécurité » à l'envoi d'une fiche | Règles non publiées ou mal collées | Étape 10.4 : recoller tout le fichier `firestore.rules` et **Publier**. |
| Page de suivi : « Le compte … n'a pas accès aux fiches » | Adresse absente des règles, ou écrite avec des majuscules | Étape 10.4 : vérifier l'adresse, en minuscules, entre apostrophes, puis **Publier**. |
| Page de suivi : « Cette adresse n'est pas autorisée pour la connexion » | Domaine absent des domaines autorisés | Étape 10.2, point 3 : ajouter le domaine affiché dans la barre d'adresse. |
| Page de suivi : « La connexion Google n'est pas activée » | Fournisseur Google désactivé | Étape 10.2, points 1 et 2. |
| La fenêtre de connexion Google ne s'ouvre pas | Fenêtres surgissantes bloquées | Autoriser les fenêtres surgissantes (pop-ups) pour ce site dans le navigateur. |
| L'ancienne version s'affiche après une modification | Cache du navigateur | Recharger avec Ctrl + F5 / Cmd + Maj + R (le cache des fichiers est limité à 5 minutes). |
