// Connexion à la base de données Firebase (Firestore) pour les fiches irritants.
// La configuration est fournie automatiquement par Firebase Hosting (/__/firebase/init.json) :
// rien à recopier, il suffit d'avoir déclaré une « application Web » dans le projet Firebase.
// Sans cette configuration (par exemple en local), le partage de fiche est simplement masqué.

const SDK = "https://www.gstatic.com/firebasejs/12.18.0";
export const COLLECTION = "irritants";

let configPromise = null;
let appPromise = null;

export function loadFirebaseConfig() {
  if (!configPromise) {
    configPromise = fetch("/__/firebase/init.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => (c && c.apiKey && c.projectId ? c : null))
      .catch(() => null);
  }
  return configPromise;
}

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const cfg = await loadFirebaseConfig();
      if (!cfg) throw new Error("Configuration Firebase introuvable : déclarez une application Web dans le projet Firebase (étape 10.3 du guide).");
      const { initializeApp } = await import(`${SDK}/firebase-app.js`);
      return initializeApp(cfg);
    })();
    appPromise.catch(() => { appPromise = null; });
  }
  return appPromise;
}

export async function getDb() {
  const app = await getApp();
  const fs = await import(`${SDK}/firebase-firestore-lite.js`);
  return { db: fs.getFirestore(app), fs };
}

export async function getAuthTools() {
  const app = await getApp();
  const m = await import(`${SDK}/firebase-auth.js`);
  return { auth: m.getAuth(app), m };
}

// Traduit les erreurs Firebase en messages compréhensibles.
export function firebaseMessage(err) {
  const code = String(err?.code || "");
  const msg = String(err?.message || "");
  if (/database.*does not exist|NOT_FOUND|not-found/i.test(code + " " + msg))
    return "La base de données n'est pas encore créée dans Firebase (étape 10.1 du guide).";
  if (/permission-denied|PERMISSION_DENIED|insufficient permissions/i.test(code + " " + msg))
    return "Accès refusé par les règles de sécurité de la base de données.";
  if (/unavailable|network|Failed to fetch/i.test(code + " " + msg))
    return "Impossible de joindre la base de données. Vérifiez votre connexion et réessayez.";
  if (code === "auth/popup-blocked") return "Le navigateur a bloqué la fenêtre de connexion : autorisez les fenêtres surgissantes pour ce site, puis réessayez.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Connexion annulée.";
  if (code === "auth/unauthorized-domain")
    return "Cette adresse n'est pas autorisée pour la connexion : ajoutez-la dans Firebase › Authentication › Paramètres › Domaines autorisés (étape 10.2 du guide).";
  if (code === "auth/operation-not-allowed" || code === "auth/configuration-not-found")
    return "La connexion Google n'est pas activée dans Firebase › Authentication (étape 10.2 du guide).";
  return msg || "Erreur inattendue.";
}

/** Enregistre une fiche irritant (création uniquement : les utilisateurs ne peuvent ni lire ni modifier). */
export async function saveFiche(fiche) {
  const { db, fs } = await getDb();
  await fs.addDoc(fs.collection(db, COLLECTION), {
    ...fiche,
    statut: "nouveau",
    commentaire: "",
    consentement: true,
    createdAt: fs.serverTimestamp(),
  });
}
