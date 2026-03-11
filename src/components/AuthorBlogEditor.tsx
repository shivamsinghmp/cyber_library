"use client";

import { useRef, useState } from "react";
import { Link2, Image, Code, Video, Type, Square, FileCode, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};

export function AuthorBlogEditor({ value, onChange, placeholder = "Write your post... (you can use the toolbar to add links, images, code, video)", minHeight = "280px" }: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [buttonOpen, setButtonOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [codeView, setCodeView] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkNofollow, setLinkNofollow] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [btnText, setBtnText] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [btnStyle, setBtnStyle] = useState<"primary" | "secondary" | "outline">("primary");
  const [btnBadge, setBtnBadge] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [codeLang, setCodeLang] = useState("text");
  const [videoUrl, setVideoUrl] = useState("");

  function insertAtCursor(html: string, cursorOffset?: number) {
    const ta = textRef.current;
    if (!ta) {
      onChange(value + html);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    onChange(before + html + after);
    const pos = start + (cursorOffset ?? html.length);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }, 0);
  }

  /** Wrap selected text in heading tag, or insert empty heading. On the blog page only the styled text shows, not the tag. */
  function wrapInHeading(level: 1 | 2 | 3 | 4) {
    const ta = textRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const tag = `h${level}`;
    const selected = value.slice(start, end);
    if (selected.trim()) {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const wrapped = `<${tag}>${selected}</${tag}>`;
      onChange(before + wrapped + after);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
      }, 0);
    } else {
      insertAtCursor(`<${tag}></${tag}>`, tag.length + 2);
    }
  }

  function insertLink() {
    if (!linkUrl.trim()) return;
    const text = linkText.trim() || linkUrl;
    const rel = linkNofollow ? ' rel="nofollow"' : "";
    insertAtCursor(`<a href="${escapeHtml(linkUrl.trim())}"${rel}>${escapeHtml(text)}</a>`);
    setLinkOpen(false);
    setLinkUrl("");
    setLinkText("");
    setLinkNofollow(false);
  }

  function insertImage() {
    if (!imageUrl.trim()) return;
    const alt = imageAlt.trim() ? ` alt="${escapeHtml(imageAlt)}"` : "";
    insertAtCursor(`<p><img src="${escapeHtml(imageUrl.trim())}"${alt} class="max-w-full h-auto rounded-lg" /></p>`);
    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  }

  function insertButton() {
    if (!btnText.trim()) return;
    const cls = btnStyle === "primary" ? "inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]" : btnStyle === "secondary" ? "inline-block rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-[var(--cream)] border border-white/20" : "inline-block rounded-xl border border-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)]";
    const badge = btnBadge.trim() ? ` <span class="ml-1.5 rounded bg-black/20 px-1.5 py-0.5 text-xs font-mono">${escapeHtml(btnBadge)}</span>` : "";
    const inner = escapeHtml(btnText.trim()) + badge;
    const wrap = btnUrl.trim() ? `<a href="${escapeHtml(btnUrl.trim())}" class="${cls}">${inner}</a>` : `<span class="${cls}">${inner}</span>`;
    insertAtCursor(`<p>${wrap}</p>`);
    setButtonOpen(false);
    setBtnText("");
    setBtnUrl("");
    setBtnStyle("primary");
    setBtnBadge("");
  }

  function insertCodeBlock() {
    const lang = codeLang.trim() || "text";
    const escaped = escapeHtml(codeContent);
    insertAtCursor(`<pre class="rounded-xl bg-black/40 p-4 overflow-x-auto text-sm"><code class="language-${escapeHtml(lang)}">${escaped}</code></pre>`);
    setCodeOpen(false);
    setCodeContent("");
    setCodeLang("text");
  }

  function youtubeEmbed(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    if (url.includes("youtube.com/embed/")) return url;
    return null;
  }
  function vimeoEmbed(url: string): string | null {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
    return null;
  }

  function insertVideo() {
    const u = videoUrl.trim();
    const yt = youtubeEmbed(u);
    const vim = vimeoEmbed(u);
    const embed = yt || vim;
    if (!embed) return;
    insertAtCursor(`<figure class="my-4"><div class="aspect-video w-full rounded-xl overflow-hidden bg-black/30"><iframe src="${escapeHtml(embed)}" class="w-full h-full" allowfullscreen title="Video"></iframe></div><figcaption class="mt-1 text-xs text-[var(--cream-muted)]">Video</figcaption></figure>`);
    setVideoOpen(false);
    setVideoUrl("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-white/10 bg-black/30 p-1.5">
        <button type="button" onClick={() => wrapInHeading(1)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Heading 1">H1</button>
        <button type="button" onClick={() => wrapInHeading(2)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Heading 2">H2</button>
        <button type="button" onClick={() => wrapInHeading(3)} className="rounded-lg px-2 py-1.5 text-xs text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Heading 3">H3</button>
        <button type="button" onClick={() => wrapInHeading(4)} className="rounded-lg px-2 py-1.5 text-[10px] text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Heading 4">H4</button>
        <div className="h-4 w-px bg-white/10" />
        <button type="button" onClick={() => setLinkOpen(true)} className="rounded-lg p-2 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Insert link (nofollow/dofollow)">
          <Link2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setImageOpen(true)} className="rounded-lg p-2 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Insert image">
          <Image className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setButtonOpen(true)} className="rounded-lg p-2 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Insert button/link">
          <Square className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setCodeOpen(true)} className="rounded-lg p-2 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Insert code block">
          <Code className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setVideoOpen(true)} className="rounded-lg p-2 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Insert video (YouTube/Vimeo)">
          <Video className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-white/10" />
        <button type="button" onClick={() => setCodeView(!codeView)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]" title="Toggle code / visual">
          <FileCode className="h-3.5 w-3.5" /> {codeView ? "Visual" : "Code"}
        </button>
      </div>
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={codeView ? "HTML content..." : placeholder}
        className={`w-full rounded-b-xl border border-t-0 border-white/10 bg-black/40 px-3 py-2.5 text-sm leading-relaxed text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none ${codeView ? "font-mono" : ""}`}
        style={{ minHeight }}
        spellCheck={!codeView}
      />

      {/* Link modal */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setLinkOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--ink)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]"><Link2 className="h-4 w-4" /> Insert link</span>
              <button type="button" onClick={() => setLinkOpen(false)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL *" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
              <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Link text (optional)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
              <label className="flex items-center gap-2 text-xs text-[var(--cream-muted)]">
                <input type="checkbox" checked={linkNofollow} onChange={(e) => setLinkNofollow(e.target.checked)} className="rounded border-white/20 text-[var(--accent)]" />
                Nofollow (for SEO)
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setLinkOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream)]">Cancel</button>
              <button type="button" onClick={insertLink} disabled={!linkUrl.trim()} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Image modal */}
      {imageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setImageOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--ink)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]"><Image className="h-4 w-4" /> Insert image</span>
              <button type="button" onClick={() => setImageOpen(false)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL *" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
              <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Alt text (for SEO)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setImageOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream)]">Cancel</button>
              <button type="button" onClick={insertImage} disabled={!imageUrl.trim()} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Button modal */}
      {buttonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setButtonOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--ink)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]"><Type className="h-4 w-4" /> Insert button</span>
              <button type="button" onClick={() => setButtonOpen(false)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              <input type="text" value={btnText} onChange={(e) => setBtnText(e.target.value)} placeholder="Button text *" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
              <input type="url" value={btnUrl} onChange={(e) => setBtnUrl(e.target.value)} placeholder="Link URL (optional)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
              <select value={btnStyle} onChange={(e) => setBtnStyle(e.target.value as "primary" | "secondary" | "outline")} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]">
                <option value="primary">Primary (accent)</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
              <input type="text" value={btnBadge} onChange={(e) => setBtnBadge(e.target.value)} placeholder="Badge (number or letter, optional)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setButtonOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream)]">Cancel</button>
              <button type="button" onClick={insertButton} disabled={!btnText.trim()} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Code modal */}
      {codeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCodeOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[var(--ink)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]"><Code className="h-4 w-4" /> Insert code block</span>
              <button type="button" onClick={() => setCodeOpen(false)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              <input type="text" value={codeLang} onChange={(e) => setCodeLang(e.target.value)} placeholder="Language (e.g. javascript, html, css)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--cream)]" />
              <textarea value={codeContent} onChange={(e) => setCodeContent(e.target.value)} placeholder="Paste or type code..." rows={12} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60" spellCheck={false} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setCodeOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream)]">Cancel</button>
              <button type="button" onClick={insertCodeBlock} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Video modal */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setVideoOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--ink)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]"><Video className="h-4 w-4" /> Insert video</span>
              <button type="button" onClick={() => setVideoOpen(false)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-2 text-xs text-[var(--cream-muted)]">YouTube or Vimeo URL</p>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setVideoOpen(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream)]">Cancel</button>
              <button type="button" onClick={insertVideo} disabled={!youtubeEmbed(videoUrl) && !vimeoEmbed(videoUrl)} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
