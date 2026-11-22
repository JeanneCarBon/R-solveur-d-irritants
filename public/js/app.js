import { PROVIDERS, chat, listModels } from "./providers.js";
import { renderMarkdown } from "./markdown.js";
import { buildSystemPrompt, buildFichePrompt, CATEGORIES, EXAMPLES } from "./prompt.js";
import { loadFirebaseConfig, saveFiche, firebaseMessage } from "./firebase.js";

const $ = (s) => document.querySelector(s);
const CONFIG_KEY = "irritants.config";
const HISTORY_KEY = "irritants.history";

let config = null;
let messages = [];
let busy = false;
let controller = null;
let shareEnabled = false; // la base de données Firebase est-elle disponible ?
let shared = false;       // fiche déjà envoyée pour cette conversation

// ---------- Stockage (tout est protégé : le navigateur peut refuser) ----------
function readStore(store, key) {
  try { const v = store.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function writeStore(store, key, value) {
  try { store.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}
function removeStore(key) {
  try { localStorage.removeItem(key); } catch {}
  try { sessionStorage.removeItem(key); } catch {}
}
function loadConfig() {
  return readStore(localStorage, CONFIG_KEY) || readStore(sessionStorage, CONFIG_KEY);
}
function saveConfig(cfg) {
  removeStore(CONFIG_KEY);
  writeStore(cfg.remember ? localStorage : sessionStorage, CONFIG_KEY, cfg);
}
function saveHistory() { writeStore(sessionStorage, HISTORY_KEY, messages); }

// ---------- Écran de configuration ----------
const providerSel = $("#provider");
const keyInput = $("#api-key");
const modelInput = $("#model");
const modelList = $("#model-list");
const modelStatus = $("#model-status");
const setupError = $("#setup-error");

for (const [id, p] of Object.entries(PROVIDERS)) {
  providerSel.add(new Option(p.label, id));
}

function fillDatalist(ids) {
  modelList.replaceChildren(...ids.map((id) => new Option(id, id)));
}

function onProviderChange(keepModel = false) {
  const p = PROVIDERS[providerSel.value];
  keyInput.placeholder = p.keyHint;
  $("#key-link").href = p.keyUrl;
  if (!keepModel) modelInput.value = p.defaultModel;
  fillDatalist(p.suggestions);
  modelStatus.textContent = "Cliquez sur « Tester la clé » pour vérifier votre clé et voir vos modèles.";
  modelStatus.className = "hint";
}
providerSel.addEventListener("change", () => onProviderChange(false));

$("#toggle-key").addEventListener("click", (e) => {
  const show = keyInput.type === "password";
  keyInput.type = show ? "text" : "password";
  e.currentTarget.textContent = show ? "Masquer" : "Afficher";
});

$("#load-models").addEventListener("click", async (e) => {
  const key = keyInput.value.trim();
  if (!key) { showSetupError("Saisissez d'abord votre clé API."); keyInput.focus(); return; }
  const btn = e.currentTarget;
  btn.disabled = true;
  modelStatus.className = "hint";
  modelStatus.textContent = "Vérification de la clé…";
  try {
    const ids = await listModels(providerSel.value, key);
    if (ids.length) fillDatalist(ids);
    modelStatus.className = "hint ok";
    modelStatus.textContent = `Clé valide. ${ids.length} modèle(s) disponible(s) : choisissez-en un dans la liste du champ « Modèle ».`;
    hideSetupError();
  } catch (err) {
    modelStatus.className = "hint bad";
    modelStatus.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

function showSetupError(msg) { setupError.textContent = msg; setupError.hidden = false; }
function hideSetupError() { setupError.hidden = true; }

$("#setup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const apiKey = keyInput.value.trim();
  const model = modelInput.value.trim();
  if (!apiKey) return showSetupError("La clé API est obligatoire.");
  if (!model) return showSetupError("Indiquez un modèle.");
  hideSetupError();
  config = {
    provider: providerSel.value,
    apiKey,
    model,
    activity: $("#activity").value.trim(),
    remember: $("#remember").checked,
  };
  saveConfig(config);
  showChat();
});

function showSetup() {
  $("#chat").hidden = true;
  $("#setup").hidden = false;
  if (config) {
    providerSel.value = config.provider;
    onProviderChange(true);
    keyInput.value = config.apiKey;
    modelInput.value = config.model;
    $("#activity").value = config.activity || "";
    $("#remember").checked = !!config.remember;
  } else {
    onProviderChange(false);
  }
  keyInput.focus();
}

// ---------- Écran de conversation ----------
const list = $("#messages");
const welcome = $("#welcome");
const input = $("#input");
const sendBtn = $("#send");

for (const ex of EXAMPLES) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = ex;
  b.addEventListener("click", () => send(ex));
  $("#examples").append(b);
}

function showChat() {
  $("#setup").hidden = true;
  $("#chat").hidden = false;
  $("#model-badge").textContent = `${PROVIDERS[config.provider].label} · ${config.model}`;
  input.focus();
}

function scrollToEnd() { list.scrollTop = list.scrollHeight; }

function addBubble(role, content) {
  welcome.hidden = true;
  const el = document.createElement("article");
  el.className = `msg ${role}`;
  const body = document.createElement("div");
  body.className = "msg-body";
  el.append(body);
  setContent(body, role, content);
  list.append(el);
  scrollToEnd();
  return body;
}

// Certains modèles (ex. Qwen sur Groq) écrivent leur raisonnement entre balises <think> : on le masque.
function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?(<\/think>\s*|$)/g, "");
}

function setContent(body, role, content) {
  if (role === "assistant") body.innerHTML = renderMarkdown(stripThinking(content));
  else body.textContent = content;
}

function renderHistory() {
  list.querySelectorAll(".msg").forEach((n) => n.remove());
  welcome.hidden = messages.length > 0;
  for (const m of messages) addBubble(m.role, m.content);
}

function setBusy(b) {
  busy = b;
  sendBtn.textContent = b ? "Arrêter" : "Envoyer";
  sendBtn.classList.toggle("stop", b);
}

async function send(text) {
  text = text.trim();
  if (busy || !text) return;
  input.value = "";
  autoGrow();

  messages.push({ role: "user", content: text });
  const userBody = addBubble("user", text);
  const body = addBubble("assistant", "");
  body.parentElement.classList.add("typing");

  setBusy(true);
  controller = new AbortController();
  let acc = "";
  let scheduled = false;
  const paint = () => {
    scheduled = false;
    setContent(body, "assistant", acc);
    scrollToEnd();
  };

  try {
    await chat(config.provider, {
      apiKey: config.apiKey,
      model: config.model,
      system: buildSystemPrompt(config.activity),
      messages,
      signal: controller.signal,
      onText: (t) => {
        acc += t;
        if (stripThinking(acc).trim()) body.parentElement.classList.remove("typing");
        if (!scheduled) { scheduled = true; requestAnimationFrame(paint); }
      },
    });
    acc = stripThinking(acc);
    if (!acc.trim()) acc = "_(Le modèle n'a renvoyé aucun texte.)_";
    messages.push({ role: "assistant", content: acc });
  } catch (err) {
    if (err.name === "AbortError" && stripThinking(acc).trim()) {
      acc = stripThinking(acc) + "\n\n_(Réponse interrompue.)_";
      messages.push({ role: "assistant", content: acc });
    } else {
      // On retire l'échange raté pour pouvoir réessayer proprement.
      messages.pop();
      userBody.parentElement.remove();
      body.parentElement.remove();
      if (err.name !== "AbortError") showErrorBubble(err.message);
      input.value = text;
      autoGrow();
      if (!messages.length) welcome.hidden = false;
    }
  } finally {
    body.parentElement?.classList.remove("typing");
    if (body.isConnected) paint();
    setBusy(false);
    controller = null;
    saveHistory();
    updateShare();
    input.focus();
  }
}

function showErrorBubble(msg) {
  const el = document.createElement("div");
  el.className = "msg error";
  el.setAttribute("role", "alert");
  const txt = document.createElement("p");
  txt.textContent = msg;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost";
  btn.textContent = "Vérifier mes paramètres";
  btn.addEventListener("click", showSetup);
  el.append(txt, btn);
  list.append(el);
  scrollToEnd();
}

$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) controller?.abort();
  else send(input.value);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!busy) send(input.value);
  }
});

function autoGrow() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 220) + "px";
}
input.addEventListener("input", autoGrow);

$("#new-chat").addEventListener("click", () => {
  if (busy) controller?.abort();
  if (messages.length && !confirm("Effacer la conversation en cours ?")) return;
  messages = [];
  saveHistory();
  list.querySelectorAll(".msg").forEach((n) => n.remove());
  welcome.hidden = false;
  shared = false;
  updateShare();
  input.focus();
});

$("#settings").addEventListener("click", () => {
  if (busy) controller?.abort();
  showSetup();
});

$("#export").addEventListener("click", () => {
  if (!messages.length) { alert("La conversation est vide."); return; }
  const date = new Date().toLocaleString("fr-FR");
  const md =
    `# Résolution d'irritant\n\n_Exporté le ${date} · ${PROVIDERS[config.provider].label} · ${config.model}_\n\n` +
    messages.map((m) => `## ${m.role === "user" ? "Moi" : "Assistant"}\n\n${m.content}\n`).join("\n");
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `irritant-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// ---------- Partage d'une fiche irritant ----------
const shareCta = $("#share-cta");
const shareThanks = $("#share-thanks");
const dialog = $("#share-dialog");
const shareForm = $("#share-form");
const shareFields = $("#share-fields");
const shareStatus = $("#share-status");
const shareError = $("#share-error");
const shareSend = $("#share-send");
const catSel = $("#f-categorie");
let ficheController = null;

for (const c of CATEGORIES) catSel.add(new Option(c, c));

function updateShare() {
  // Le partage est proposé une fois les 3 solutions données (2e réponse de l'assistant).
  const answered = messages.filter((m) => m.role === "assistant").length >= 2;
  shareCta.hidden = !(shareEnabled && answered && !shared);
  shareThanks.hidden = !(shareEnabled && shared && messages.length);
  // Toujours en bas de la conversation
  list.append(shareCta, shareThanks);
}

// Texte de la conversation envoyé à l'IA pour préparer la fiche (raccourci si très long).
function transcript() {
  const lines = messages.map((m) => `${m.role === "user" ? "UTILISATEUR" : "ASSISTANT"} :\n${m.content}`);
  const first = lines[0].slice(0, 3000);
  let rest = lines.slice(1).join("\n\n");
  if (rest.length > 7000) rest = "[…]\n" + rest.slice(-7000);
  return first + (rest ? "\n\n" + rest : "");
}

function parseFiche(text) {
  const t = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("pas de JSON");
  return JSON.parse(t.slice(start, end + 1));
}

const str = (v, max) => (typeof v === "string" ? v : "").trim().slice(0, max);

function fillFiche(f) {
  catSel.value = CATEGORIES.includes(f.categorie) ? f.categorie : "Autre";
  $("#f-resume").value = str(f.resume, 1500);
  $("#f-motscles").value = (Array.isArray(f.motsCles) ? f.motsCles : []).map((k) => str(k, 40)).filter(Boolean).slice(0, 8).join(", ");
  $("#f-frequence").value = str(f.frequence, 200);
  $("#f-impact").value = str(f.impact, 300);
  $("#f-sol-rapide").value = str(f.solutionRapide, 600);
  $("#f-sol-orga").value = str(f.solutionOrga, 600);
  $("#f-sol-ia").value = str(f.solutionIA, 600);
}

function showShareError(msg) { shareError.textContent = msg; shareError.hidden = false; }

async function openShare() {
  if (busy) return;
  shareForm.reset();
  shareError.hidden = true;
  $("#f-activite").value = config.activity || "";
  catSel.value = "Autre";
  shareFields.disabled = true;
  shareSend.disabled = true;
  shareStatus.className = "hint";
  shareStatus.textContent = "L'IA prépare votre fiche…";
  dialog.showModal();

  ficheController = new AbortController();
  let acc = "";
  try {
    await chat(config.provider, {
      apiKey: config.apiKey,
      model: config.model,
      system: buildFichePrompt(),
      messages: [{ role: "user", content: `Voici la conversation à résumer :\n\n${transcript()}\n\nProduis maintenant la fiche JSON.` }],
      signal: ficheController.signal,
      onText: (t) => { acc += t; },
    });
    fillFiche(parseFiche(acc));
    shareStatus.className = "hint ok";
    shareStatus.textContent = "Fiche prête : relisez-la avant de l'envoyer.";
  } catch (err) {
    if (err.name === "AbortError") return;
    shareStatus.className = "hint bad";
    shareStatus.textContent = "La fiche n'a pas pu être préparée automatiquement : remplissez-la vous-même.";
  } finally {
    ficheController = null;
    if (dialog.open) {
      shareFields.disabled = false;
      shareSend.disabled = false;
      $("#f-resume").focus();
    }
  }
}

function closeShare() {
  ficheController?.abort();
  dialog.close();
}

$("#share-open").addEventListener("click", openShare);
$("#share-cancel").addEventListener("click", closeShare);
dialog.addEventListener("cancel", () => ficheController?.abort());

shareForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  shareError.hidden = true;
  const resume = $("#f-resume").value.trim();
  const email = $("#f-email").value.trim().toLowerCase();
  if (!resume) { showShareError("Décrivez l'irritant en quelques phrases."); $("#f-resume").focus(); return; }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showShareError("L'adresse e-mail ne semble pas valide (ou laissez le champ vide)."); $("#f-email").focus(); return; }
  if (!$("#f-consent").checked) { showShareError("Cochez la case d'accord pour envoyer la fiche."); return; }

  const fiche = {
    categorie: catSel.value,
    resume,
    motsCles: [...new Set($("#f-motscles").value.split(/[,;]/).map((k) => k.trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 8),
    frequence: $("#f-frequence").value.trim(),
    impact: $("#f-impact").value.trim(),
    solutionRapide: $("#f-sol-rapide").value.trim(),
    solutionOrga: $("#f-sol-orga").value.trim(),
    solutionIA: $("#f-sol-ia").value.trim(),
    activite: $("#f-activite").value.trim(),
    prefere: shareForm.elements.prefere.value,
    email,
  };

  shareSend.disabled = true;
  shareSend.textContent = "Envoi…";
  try {
    await saveFiche(fiche);
    shared = true;
    dialog.close();
    updateShare();
    scrollToEnd();
  } catch (err) {
    showShareError("La fiche n'a pas pu être envoyée. " + firebaseMessage(err));
  } finally {
    shareSend.disabled = false;
    shareSend.textContent = "Envoyer la fiche";
  }
});

// ---------- Démarrage ----------
config = loadConfig();
messages = readStore(sessionStorage, HISTORY_KEY) || [];
if (config && config.apiKey && PROVIDERS[config.provider]) {
  showChat();
  renderHistory();
  updateShare();
} else {
  config = null;
  showSetup();
}

// Le partage n'apparaît que si la base de données Firebase est configurée.
loadFirebaseConfig().then((cfg) => {
  shareEnabled = !!cfg;
  if (config) updateShare();
});
