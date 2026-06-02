import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "a", "img", "pre", "code",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "div", "span",
  "figure", "figcaption", "iframe",
  "table", "thead", "tbody", "tr", "th", "td", "blockquote", "hr",
];

const ALLOWED_ATTR = ["href", "src", "alt", "rel", "title", "allowfullscreen", "class", "loading", "width", "height"];

const YOUTUBE_VIMEO_RE =
  /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;

export function sanitizeBlogHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  // Step 1: DOMPurify — removes all script/event-handler XSS vectors.
  // No addHook/removeHook (module-level singleton is not concurrency-safe in SSR).
  // Iframe whitelist is enforced in step 2 via post-processing regex.
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
    FORBID_ATTR: ["srcdoc", "formaction", "action", "data", "style", "id", "onload", "onerror"],
    FORCE_BODY: true,
  });

  // Step 2: Post-process iframes — enforce YouTube/Vimeo src allowlist.
  // This replaces the hook-based approach to avoid DOMPurify singleton race conditions
  // when multiple concurrent SSR requests call sanitizeBlogHtml simultaneously.
  return clean.replace(/<iframe([^>]*)>/gi, (_match, attrs: string) => {
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return "";
    const src = srcMatch[1];
    if (!YOUTUBE_VIMEO_RE.test(src)) return "";
    // Strip everything, then rebuild with only safe attributes
    const safeAttrs = `src="${src}" class="w-full aspect-video" title="video" loading="lazy" allowfullscreen`;
    return `<iframe ${safeAttrs}>`;
  });
}

/**
 * Safe serialization of JSON-LD structured data for use inside
 * <script type="application/ld+json"> tags.
 *
 * JSON.stringify alone is NOT safe in this context: if any string value
 * contains "</script>", the browser closes the script tag early and can
 * execute injected HTML.  Unicode-escaping <, >, and & prevents this while
 * keeping the output valid JSON (JSON parsers decode < etc. correctly).
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
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
