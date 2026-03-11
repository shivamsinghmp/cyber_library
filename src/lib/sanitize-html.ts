/**
 * Sanitize blog body HTML for safe display. Allows only safe tags and strips scripts/events.
 */
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "a", "img", "pre", "code", "ul", "ol", "li", "h1", "h2", "h3", "h4", "div", "span", "figure", "figcaption", "iframe"]);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function sanitizeBlogHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  let out = html;
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  out = out.replace(/\s*on\w+=["'][^"']*["']/gi, "");
  out = out.replace(/<(\w+)(\s[^>]*)?>/gi, (m, name, rest = "") => {
    const tag = name.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (tag === "a") {
      const href = rest.match(/href=["']([^"']+)["']/i);
      if (!href) return "";
      const u = href[1].trim();
      if (!/^https?:\/\/|\/|#/.test(u)) return "";
      const rel = rest.match(/rel=["']([^"']+)["']/i);
      const safeRel = rel ? ` rel="${escapeHtml(rel[1].slice(0, 100))}"` : "";
      return `<a href="${escapeHtml(u)}"${safeRel}>`;
    }
    if (tag === "img") {
      const src = rest.match(/src=["']([^"']+)["']/i);
      if (!src || !/^https?:\/\//i.test(src[1])) return "";
      const alt = rest.match(/alt=["']([^"']*)["']/i);
      const altStr = alt ? ` alt="${escapeHtml(alt[1].slice(0, 200))}"` : "";
      return `<img src="${escapeHtml(src[1])}"${altStr} />`;
    }
    if (tag === "iframe") {
      const src = rest.match(/src=["']([^"']+)["']/i);
      if (!src) return "";
      const s = src[1];
      if (!s.includes("youtube.com") && !s.includes("vimeo.com")) return "";
      return `<iframe src="${escapeHtml(s)}" title="video" class="w-full aspect-video" allowfullscreen></iframe>`;
    }
    return m;
  });
  out = out.replace(/<\/(\w+)>/gi, (m, name) => (ALLOWED.has(name.toLowerCase()) ? m : ""));
  return out;
}

/** Sanitize custom CSS for blog post. Removes script, expression, javascript: url, etc. */
export function sanitizeCustomCss(css: string): string {
  if (!css || typeof css !== "string") return "";
  let out = css;
  out = out.replace(/javascript\s*:/gi, "");
  out = out.replace(/vbscript\s*:/gi, "");
  out = out.replace(/expression\s*\(/gi, "");
  out = out.replace(/behavior\s*:/gi, "");
  out = out.replace(/-moz-binding\s*:/gi, "");
  out = out.replace(/url\s*\(\s*["']?\s*javascript\s*:/gi, "url(\"\"");
  out = out.replace(/url\s*\(\s*["']?\s*vbscript\s*:/gi, "url(\"\"");
  out = out.replace(/@import\s+url\s*\(\s*["']?\s*javascript\s*:/gi, "");
  out = out.replace(/<script/gi, "");
  out = out.replace(/<\/script>/gi, "");
  return out.slice(0, 15000);
}

/** Prefix each selector in a selector list with scopeClass (comma-aware, respects parens/brackets). */
function prefixSelectorList(selectorList: string, scopeClass: string): string {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < selectorList.length; i++) {
    const c = selectorList[i];
    if (c === "(" || c === "[") {
      depth++;
      current += c;
      continue;
    }
    if (c === ")" || c === "]") {
      depth--;
      current += c;
      continue;
    }
    if (c === "," && depth === 0) {
      const sel = current.trim();
      if (sel) parts.push(scopeClass + " " + sel);
      current = "";
      continue;
    }
    current += c;
  }
  const sel = current.trim();
  if (sel) parts.push(scopeClass + " " + sel);
  return parts.join(", ");
}

/** Scope all selectors in CSS so they apply only inside an element with scopeClass (e.g. .blog-post-body). */
export function scopeCustomCss(css: string, scopeClass: string): string {
  if (!css || typeof css !== "string") return "";
  const out: string[] = [];
  let i = 0;
  const trimStart = () => {
    while (i < css.length && /[\s\n]/.test(css[i])) i++;
  };
  while (i < css.length) {
    trimStart();
    if (i >= css.length) break;
    let head = "";
    while (i < css.length && css[i] !== "{") {
      head += css[i];
      i++;
    }
    head = head.trim();
    if (i >= css.length) break;
    i++; // skip {
    let depth = 1;
    let block = "";
    while (i < css.length && depth > 0) {
      const c = css[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      if (depth > 0) block += c;
      i++;
    }
    if (!head) continue;
    if (head.startsWith("@")) {
      if (/^@(keyframes|font-face)\s/i.test(head)) {
        out.push(head + " { " + block + " }");
      } else {
        out.push(head + " { " + scopeCustomCss(block, scopeClass) + " }");
      }
    } else {
      out.push(prefixSelectorList(head, scopeClass) + " { " + block.trim() + " }");
    }
  }
  return out.join("\n");
}
