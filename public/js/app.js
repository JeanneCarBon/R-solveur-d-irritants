import { PROVIDERS, chat, listModels } from "./providers.js";
import { renderMarkdown } from "./markdown.js";
import { buildSystemPrompt, EXAMPLES } from "./prompt.js";

const $ = (s) => document.querySelector(s);
const CONFIG_KEY = "irritants.config";
const HISTORY_KEY = "irritants.history";

let config = null;
let messages = [];
let busy = false;
let controller = null;

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

// ---------- Démarrage ----------
config = loadConfig();
messages = readStore(sessionStorage, HISTORY_KEY) || [];
if (config && config.apiKey && PROVIDERS[config.provider]) {
  showChat();
  renderHistory();
} else {
  config = null;
  showSetup();
}
