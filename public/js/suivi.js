// Page de suivi des irritants : réservée au compte Google autorisé dans les règles Firestore.
import { getDb, getAuthTools, loadFirebaseConfig, firebaseMessage, COLLECTION } from "./firebase.js";
import { CATEGORIES } from "./prompt.js";

const $ = (s) => document.querySelector(s);

// Étapes de la boucle de traitement. Les clés doivent rester identiques à celles des règles de sécurité.
const STATUTS = {
  nouveau: "Nouveau",
  analyse: "En analyse",
  action: "Action en cours",
  traite: "Traité",
  ecarte: "Écarté",
};
// Solution jugée la plus utile par le collaborateur.
const PREFERE = { rapide: "La solution rapide", orga: "La solution d'organisation", ia: "La solution avec l'IA", "": "Non précisé" };
const prefereOf = (f) => PREFERE[f.prefere ?? ""] || "Non précisé";

let fiches = [];
let filters = { statut: "", cat: "", q: "" };
let tools = null; // { db, fs }

// ---------- Connexion ----------
const loginStatus = $("#login-status");
const loginError = $("#login-error");
const loginBtn = $("#google-login");

function showLoginError(msg) { loginError.textContent = msg; loginError.hidden = false; }

async function start() {
  const cfg = await loadFirebaseConfig();
  if (!cfg) {
    loginStatus.textContent = "";
    showLoginError("Configuration Firebase introuvable. Cette page ne fonctionne qu'une fois l'application en ligne et une « application Web » déclarée dans le projet Firebase (étape 10.3 du guide).");
    return;
  }
  let a;
  try {
    a = await getAuthTools();
  } catch (err) {
    loginStatus.textContent = "";
    showLoginError(firebaseMessage(err));
    return;
  }
  const { auth, m } = a;

  loginBtn.addEventListener("click", async () => {
    loginError.hidden = true;
    loginBtn.disabled = true;
    try {
      const provider = new m.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await m.signInWithPopup(auth, provider);
    } catch (err) {
      showLoginError(firebaseMessage(err));
    } finally {
      loginBtn.disabled = false;
    }
  });
  $("#logout").addEventListener("click", () => m.signOut(auth));

  m.onAuthStateChanged(auth, async (user) => {
    if (!user) {
      $("#board").hidden = true;
      $("#login").hidden = false;
      loginStatus.textContent = "Connectez-vous avec le compte Google autorisé.";
      loginBtn.hidden = false;
      return;
    }
    loginStatus.textContent = "Chargement des fiches…";
    loginBtn.hidden = true;
    try {
      tools = await getDb();
      await loadFiches();
      $("#user-badge").textContent = user.email || "";
      $("#login").hidden = true;
      $("#board").hidden = false;
    } catch (err) {
      const denied = /permission|insufficient/i.test(String(err?.code) + String(err?.message));
      showLoginError(denied
        ? `Le compte ${user.email} n'a pas accès aux fiches. Vérifiez que cette adresse figure, en minuscules, dans les règles de sécurité de la base de données (étape 10.4 du guide).`
        : firebaseMessage(err));
      await m.signOut(auth);
    }
  });
}

// ---------- Données ----------
async function loadFiches() {
  const { db, fs } = tools;
  const snap = await fs.getDocs(fs.query(fs.collection(db, COLLECTION), fs.orderBy("createdAt", "desc")));
  fiches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  render();
}

function dateOf(f) {
  const d = f.createdAt?.toDate ? f.createdAt.toDate() : null;
  return d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
}

function matches(f) {
  if (filters.statut && f.statut !== filters.statut) return false;
  if (filters.cat && f.categorie !== filters.cat) return false;
  if (filters.q) {
    const hay = [f.resume, f.solutionRapide, f.solutionOrga, f.solutionIA, f.piste, f.impact, f.frequence, f.activite, f.categorie, f.commentaire, ...(f.motsCles || [])]
      .join(" ").toLowerCase();
    if (!filters.q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

// ---------- Affichage ----------
function render() {
  renderStatusFilters();
  renderSide();
  const list = fiches.filter(matches);
  $("#count").textContent = `${list.length} fiche(s) affichée(s) sur ${fiches.length}`;
  const box = $("#fiches");
  box.replaceChildren(...list.map(renderFiche));
  if (!fiches.length) {
    const p = document.createElement("p");
    p.className = "empty muted";
    p.textContent = "Aucune fiche pour l'instant. Elles apparaîtront ici dès qu'un utilisateur partagera son irritant.";
    box.append(p);
  }
}

function chipButton(label, active, onClick, statut) {
  const b = document.createElement("button");
  if (statut) b.dataset.statut = statut;
  b.type = "button";
  b.className = "filter-chip" + (active ? " active" : "");
  b.setAttribute("aria-pressed", String(active));
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function renderStatusFilters() {
  const box = $("#status-filters");
  const count = (s) => fiches.filter((f) => f.statut === s).length;
  box.replaceChildren(
    chipButton(`Toutes (${fiches.length})`, !filters.statut, () => { filters.statut = ""; render(); }),
    ...Object.entries(STATUTS).map(([k, label]) =>
      chipButton(`${label} (${count(k)})`, filters.statut === k, () => { filters.statut = filters.statut === k ? "" : k; render(); }, k)
    )
  );
}

function renderSide() {
  // Catégories
  const cats = new Map();
  for (const f of fiches) cats.set(f.categorie, (cats.get(f.categorie) || 0) + 1);
  const rows = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    td1.textContent = c;
    td2.textContent = n;
    tr.append(td1, td2);
    return tr;
  });
  $("#cat-table").replaceChildren(...rows);

  // Solutions préférées
  const pref = Object.keys(PREFERE).filter((k) => k).map((k) => [PREFERE[k], fiches.filter((f) => f.prefere === k).length]);
  $("#pref-table").replaceChildren(...pref.map(([label, n]) => {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    td1.textContent = label;
    td2.textContent = n;
    tr.append(td1, td2);
    return tr;
  }));

  // Mots-clés
  const kw = new Map();
  for (const f of fiches) for (const k of f.motsCles || []) kw.set(k, (kw.get(k) || 0) + 1);
  const top = [...kw.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 30);
  $("#keywords").replaceChildren(...top.map(([k, n]) =>
    chipButton(`${k} · ${n}`, filters.q === k, () => {
      filters.q = filters.q === k ? "" : k;
      $("#search").value = filters.q;
      render();
    })
  ));
}

function addDetail(dl, term, value, href) {
  if (!value) return;
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = value;
    dd.append(a);
  } else {
    dd.textContent = value;
  }
  dl.append(dt, dd);
}

function renderFiche(f) {
  const el = $("#fiche-tpl").content.firstElementChild.cloneNode(true);
  el.dataset.statut = f.statut;
  el.querySelector(".fiche-cat").textContent = f.categorie || "Sans catégorie";
  el.querySelector(".fiche-date").textContent = dateOf(f);
  el.querySelector(".fiche-resume").textContent = f.resume || "";

  const dl = el.querySelector(".fiche-details");
  addDetail(dl, "Fréquence", f.frequence);
  addDetail(dl, "Impact", f.impact);
  addDetail(dl, "Solution rapide", f.solutionRapide);
  addDetail(dl, "Organisation", f.solutionOrga);
  addDetail(dl, "Avec l'IA", f.solutionIA);
  addDetail(dl, "Piste retenue", f.piste); // anciennes fiches
  addDetail(dl, "Préférée", f.prefere ? prefereOf(f) : "");
  addDetail(dl, "Activité", f.activite);
  if (f.email) addDetail(dl, "Contact", f.email, `mailto:${f.email}?subject=${encodeURIComponent("Votre irritant : suite donnée")}`);

  el.querySelector(".fiche-tags").replaceChildren(...(f.motsCles || []).map((k) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = k;
    return s;
  }));

  const sel = el.querySelector(".fiche-statut");
  for (const [k, label] of Object.entries(STATUTS)) sel.add(new Option(label, k));
  sel.value = f.statut in STATUTS ? f.statut : "nouveau";
  const comment = el.querySelector(".fiche-comment");
  comment.value = f.commentaire || "";
  const saved = el.querySelector(".fiche-saved");
  const saveBtn = el.querySelector(".fiche-save");

  const markDirty = () => { saved.textContent = "Modifications non enregistrées"; saved.className = "fiche-saved hint warn"; };
  sel.addEventListener("change", markDirty);
  comment.addEventListener("input", markDirty);

  saveBtn.addEventListener("click", async () => {
    const { db, fs } = tools;
    saveBtn.disabled = true;
    try {
      const update = { statut: sel.value, commentaire: comment.value.trim(), updatedAt: fs.serverTimestamp() };
      await fs.updateDoc(fs.doc(db, COLLECTION, f.id), update);
      Object.assign(f, { statut: update.statut, commentaire: update.commentaire });
      el.dataset.statut = f.statut;
      saved.textContent = "Enregistré";
      saved.className = "fiche-saved hint ok";
      renderStatusFilters();
    } catch (err) {
      saved.textContent = firebaseMessage(err);
      saved.className = "fiche-saved hint bad";
    } finally {
      saveBtn.disabled = false;
    }
  });

  el.querySelector(".fiche-delete").addEventListener("click", async () => {
    if (!confirm("Supprimer définitivement cette fiche ? Cette action ne peut pas être annulée.")) return;
    const { db, fs } = tools;
    try {
      await fs.deleteDoc(fs.doc(db, COLLECTION, f.id));
      fiches = fiches.filter((x) => x !== f);
      render();
    } catch (err) {
      saved.textContent = firebaseMessage(err);
      saved.className = "fiche-saved hint bad";
    }
  });

  return el;
}

// ---------- Filtres et actions ----------
const catFilter = $("#filter-cat");
catFilter.add(new Option("Toutes les catégories", ""));
for (const c of CATEGORIES) catFilter.add(new Option(c, c));
catFilter.addEventListener("change", () => { filters.cat = catFilter.value; render(); });

let searchTimer;
$("#search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { filters.q = e.target.value.trim().toLowerCase(); render(); }, 200);
});

$("#refresh").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  $("#board-error").hidden = true;
  try { await loadFiches(); }
  catch (err) { $("#board-error").textContent = firebaseMessage(err); $("#board-error").hidden = false; }
  finally { btn.disabled = false; }
});

// Export CSV lisible par Excel (séparateur point-virgule, accents conservés).
$("#export-csv").addEventListener("click", () => {
  const list = fiches.filter(matches);
  if (!list.length) { alert("Aucune fiche à exporter."); return; }
  const cols = [
    ["Date", dateOf],
    ["Statut", (f) => STATUTS[f.statut] || f.statut],
    ["Catégorie", (f) => f.categorie],
    ["Irritant", (f) => f.resume],
    ["Mots-clés", (f) => (f.motsCles || []).join(", ")],
    ["Fréquence", (f) => f.frequence],
    ["Impact", (f) => f.impact],
    ["Solution rapide", (f) => f.solutionRapide],
    ["Solution d'organisation", (f) => f.solutionOrga],
    ["Solution avec l'IA", (f) => f.solutionIA],
    ["Activité", (f) => f.activite],
    ["Solution préférée", prefereOf],
    ["E-mail", (f) => f.email],
    ["Commentaire", (f) => f.commentaire],
  ];
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s; // évite qu'Excel interprète le texte comme une formule
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.map((c) => cell(c[0])).join(";"), ...list.map((f) => cols.map((c) => cell(c[1](f))).join(";"))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `irritants-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

start();
