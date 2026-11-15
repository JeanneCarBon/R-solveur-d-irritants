// Petit moteur Markdown sécurisé : tout le texte est échappé avant mise en forme,
// donc aucune balise HTML venant de l'IA n'est interprétée.

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(raw) {
  const codes = [];
  let s = esc(raw).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

const indentOf = (l) => l.match(/^\s*/)[0].length;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => inline(c.trim()));
}

function parseList(lines, i) {
  const base = indentOf(lines[i]);
  const ordered = /^\s*\d+[.)]\s/.test(lines[i]);
  const items = [];
  const sameType = (l) => /^\s*\d+[.)]\s/.test(l) === ordered;
  while (i < lines.length) {
    const l = lines[i];
    const m = l.match(LIST_RE);
    if (m && m[1].length === base && (sameType(l) || !items.length)) {
      items.push({ text: m[3], sub: [] });
      i++;
    } else if (!l.trim()) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && (indentOf(next) > base || (LIST_RE.test(next) && indentOf(next) === base && sameType(next)))) {
        i++;
      } else break;
    } else if (indentOf(l) > base && items.length) {
      items[items.length - 1].sub.push(l);
      i++;
    } else break;
  }
  const tag = ordered ? "ol" : "ul";
  const html =
    `<${tag}>` +
    items
      .map((it) => {
        let inner = inline(it.text);
        if (it.sub.length) {
          const min = Math.min(...it.sub.filter((s) => s.trim()).map(indentOf));
          inner += renderMarkdown(it.sub.map((s) => s.slice(min)).join("\n"));
        }
        return `<li>${inner}</li>`;
      })
      .join("") +
    `</${tag}>`;
  return [html, i];
}

export function renderMarkdown(src) {
  const lines = String(src).replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    let m;

    if (t.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++;
      html += `<pre><code>${esc(buf.join("\n"))}</code></pre>`;
      continue;
    }
    if (!t) { i++; continue; }

    if ((m = line.match(/^\s*(#{1,6})\s+(.*)$/))) {
      const lvl = Math.min(m[1].length + 2, 6);
      html += `<h${lvl}>${inline(m[2].replace(/#+\s*$/, ""))}</h${lvl}>`;
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { html += "<hr>"; i++; continue; }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      html +=
        `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") +
        `</tbody></table></div>`;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      html += `<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`;
      continue;
    }

    if (LIST_RE.test(line)) {
      const [h, next] = parseList(lines, i);
      html += h;
      i = next;
      continue;
    }

    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_RE.test(lines[i]) &&
      !/^\s*(#{1,6}\s|>|```)/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]))
    ) buf.push(lines[i++]);
    if (!buf.length) buf.push(lines[i++]); // garde-fou contre une boucle infinie
    html += `<p>${buf.map(inline).join("<br>")}</p>`;
  }
  return html;
}
