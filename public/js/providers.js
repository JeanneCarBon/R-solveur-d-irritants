// Connecteurs vers les fournisseurs d'IA générative.
// Les appels partent directement du navigateur de l'utilisateur vers le fournisseur :
// la clé API ne transite par aucun serveur intermédiaire.

// Le premier fournisseur de la liste est celui proposé par défaut.
export const PROVIDERS = {
  groq: {
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-120b",
    suggestions: [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3.8-27b",
    ],
    keyHint: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    // Modèles de la liste Groq qui ne servent pas à converser (audio, filtres de sécurité).
    excludeModels: /whisper|tts|orpheus|guard|playai|distil/i,
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    suggestions: ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o-mini"],
    keyHint: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-opus-5-5",
    suggestions: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
    keyHint: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    label: "Google (Gemini)",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    suggestions: ["gemini-2.5-pro", "gemini-2.5-flash"],
    keyHint: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  mistral: {
    label: "Mistral AI",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    suggestions: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
    keyHint: "Votre clé Mistral",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  openrouter: {
    label: "OpenRouter (multi-modèles)",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    suggestions: ["openrouter/auto"],
    keyHint: "sk-or-...",
    keyUrl: "https://openrouter.ai/keys",
  },
};

const ANTHROPIC_VERSION = "2026-10-21";
// Modèles Claude qui acceptent le repli automatique côté serveur en cas de refus.
const ANTHROPIC_FALLBACK_MODELS = /^claude-(opus-5-5|opus-5$|sonnet-5-5|fable-5)/;

function anthropicHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    // Obligatoire pour appeler l'API Claude directement depuis un navigateur.
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

function openaiHeaders(provider, apiKey) {
  const h = { Authorization: `Bearer ${apiKey}` };
  if (provider === PROVIDERS.openrouter) h["X-Title"] = "Resolveur d'irritants";
  return h;
}

// Transforme une réponse HTTP en erreur lisible.
async function toError(res) {
  let detail = "";
  try {
    const body = await res.text();
    try {
      const j = JSON.parse(body);
      const e = Array.isArray(j) ? j[0]?.error : j.error;
      detail = (typeof e === "string" ? e : e?.message) || j.message || j.detail || body;
    } catch {
      detail = body;
    }
  } catch { /* ignore */ }
  const hints = {
    400: "Requête refusée (nom de modèle incorrect ?)",
    401: "Clé API invalide ou expirée",
    403: "Accès refusé pour cette clé ou ce modèle",
    404: "Modèle introuvable",
    413: "Conversation trop longue pour la limite de votre offre : démarrez une nouvelle conversation",
    429: "Limite d'utilisation atteinte : patientez une minute (ou vérifiez votre crédit)",
    500: "Erreur du fournisseur, réessayez",
    503: "Fournisseur surchargé, réessayez dans un instant",
  };
  let label = hints[res.status] || "Erreur";
  if (/api[ _-]?key/i.test(String(detail)) && res.status === 400) label = hints[401];
  const err = new Error(`${label} (HTTP ${res.status})${detail ? " : " + String(detail).slice(0, 400) : ""}`);
  err.status = res.status;
  return err;
}

// Lit un flux Server-Sent Events et renvoie chaque bloc "data:".
async function* readSSE(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = raw
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (data) yield data;
    }
  }
}

function networkError(e) {
  if (e.name === "AbortError") return e;
  return new Error(
    "Impossible de joindre le fournisseur. Vérifiez votre connexion. " +
      "Si le problème persiste, ce fournisseur bloque peut-être les appels depuis un navigateur : essayez OpenRouter."
  );
}

/**
 * Envoie la conversation au fournisseur et transmet le texte au fil de l'eau via onText.
 * messages : [{ role: "user" | "assistant", content: string }]
 */
export async function chat(providerId, { apiKey, model, system, messages, signal, onText }) {
  const p = PROVIDERS[providerId];
  if (!p) throw new Error("Fournisseur inconnu");
  let res;

  try {
    if (p.kind === "anthropic") {
      const body = { model, max_tokens: 16000, system, messages, stream: true };
      const headers = { ...anthropicHeaders(apiKey), "content-type": "application/json" };
      if (ANTHROPIC_FALLBACK_MODELS.test(model)) {
        headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
        body.fallbacks = "default";
      }
      res = await fetch(`${p.baseUrl}/messages`, { method: "POST", headers, body: JSON.stringify(body), signal });
    } else if (p.kind === "gemini") {
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      };
      res = await fetch(`${p.baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } else {
      const body = { model, stream: true, messages: [{ role: "system", content: system }, ...messages] };
      res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { ...openaiHeaders(p, apiKey), "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    }
  } catch (e) {
    throw networkError(e);
  }

  if (!res.ok) throw await toError(res);

  for await (const data of readSSE(res)) {
    if (data === "[DONE]") break;
    let ev;
    try { ev = JSON.parse(data); } catch { continue; }

    if (p.kind === "anthropic") {
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") onText(ev.delta.text);
      else if (ev.type === "message_delta" && ev.delta?.stop_reason === "refusal")
        onText("\n\n_Le modèle a refusé de répondre à cette demande. Reformulez votre question._");
      else if (ev.type === "error") throw new Error(ev.error?.message || "Erreur du fournisseur");
    } else if (p.kind === "gemini") {
      if (ev.error) throw new Error(ev.error.message || "Erreur du fournisseur");
      const parts = ev.candidates?.[0]?.content?.parts || [];
      const text = parts.filter((x) => !x.thought && x.text).map((x) => x.text).join("");
      if (text) onText(text);
    } else {
      if (ev.error) throw new Error(ev.error.message || "Erreur du fournisseur");
      const text = ev.choices?.[0]?.delta?.content;
      if (text) onText(text);
    }
  }
}

/** Liste les modèles disponibles pour la clé : sert aussi à tester la clé. */
export async function listModels(providerId, apiKey) {
  const p = PROVIDERS[providerId];
  let res;
  try {
    if (p.kind === "anthropic") {
      res = await fetch(`${p.baseUrl}/models?limit=100`, { headers: anthropicHeaders(apiKey) });
    } else if (p.kind === "gemini") {
      res = await fetch(`${p.baseUrl}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey } });
    } else {
      if (p === PROVIDERS.openrouter) {
        // La liste des modèles OpenRouter est publique : on vérifie la clé à part.
        const check = await fetch(`${p.baseUrl}/key`, { headers: openaiHeaders(p, apiKey) });
        if (!check.ok) throw await toError(check);
      }
      res = await fetch(`${p.baseUrl}/models`, { headers: openaiHeaders(p, apiKey) });
    }
  } catch (e) {
    throw e.status ? e : networkError(e);
  }
  if (!res.ok) throw await toError(res);
  const j = await res.json();
  let ids;
  if (p.kind === "gemini") {
    ids = (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
  } else {
    ids = (j.data || []).filter((m) => m.active !== false).map((m) => m.id);
  }
  if (p.excludeModels) ids = ids.filter((id) => !p.excludeModels.test(id));
  return [...new Set(ids)].sort();
}
