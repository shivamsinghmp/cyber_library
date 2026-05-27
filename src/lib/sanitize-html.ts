import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "a", "img", "pre", "code",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "div", "span",
  "figure", "figcaption", "iframe",
];

const ALLOWED_ATTR = ["href", "src", "alt", "rel", "title", "allowfullscreen", "class"];

const YOUTUBE_VIMEO_RE =
  /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;

export function sanitizeBlogHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  // DOMPurify hook: enforce iframe src whitelist after sanitization.
  // Runs once per call — not a module-level side-effect so it's safe for SSR.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "IFRAME") {
      const src = node.getAttribute("src") ?? "";
      if (!YOUTUBE_VIMEO_RE.test(src)) {
        node.remove();
      } else {
        node.setAttribute("title", "video");
        node.setAttribute("class", "w-full aspect-video");
        // Explicitly forbid srcdoc — it bypasses src restrictions
        node.removeAttribute("srcdoc");
      }
    }
    // Force external links to open safely
    if (node.tagName === "A" && node.getAttribute("href")?.startsWith("http")) {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
    FORBID_ATTR: ["srcdoc", "formaction", "action", "data", "style", "id"],
    FORCE_BODY: true,
  });

  DOMPurify.removeHook("afterSanitizeAttributes");

  return clean;
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
