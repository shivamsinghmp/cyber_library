"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Save, Plus, Trash2, GripVertical, Settings2 } from "lucide-react";
import toast from "react-hot-toast";

type LinkItem = { label: string; url: string };
type FooterColumn = { title: string; links: LinkItem[] };
type SocialLink = { platform: string; url: string };

type FooterConfig = {
  columns: FooterColumn[];
  newsletter: {
    title: string;
    description: string;
    buttonText: string;
  };
  socials: SocialLink[];
  copyright: string;
};

const DEFAULT_FOOTER: FooterConfig = {
  columns: [
    {
      title: "Solutions",
      links: [
        { label: "Marketing", url: "/marketing" },
        { label: "Analytics", url: "/analytics" },
        { label: "Automation", url: "/automation" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Submit ticket", url: "/support" },
        { label: "Documentation", url: "/docs" },
        { label: "Guides", url: "/guides" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", url: "/about" },
        { label: "Blog", url: "/blog" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of service", url: "/terms" },
        { label: "Privacy policy", url: "/privacy" },
      ],
    },
  ],
  newsletter: {
    title: "Subscribe to our newsletter",
    description: "The latest news and articles, sent to your inbox weekly.",
    buttonText: "Subscribe",
  },
  socials: [
    { platform: "facebook", url: "https://facebook.com" },
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "twitter", url: "https://twitter.com" },
    { platform: "github", url: "https://github.com" },
    { platform: "youtube", url: "https://youtube.com" },
  ],
  copyright: `© ${new Date().getFullYear()} The Cyber Library. All rights reserved.`,
};

export default function FooterSettingsPage() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const val = data?.FOOTER_CONFIG_JSON?.value;
        if (val) {
          try {
            const parsed = JSON.parse(val);
      .catch((e) => console.error("Fetch error:", e));
          } catch (e) {
            console.error("Invalid FOOTER_CONFIG_JSON", e);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "FOOTER_CONFIG_JSON", value: JSON.stringify(config) }),
      });
      if (res.ok) {
        toast.success("Footer settings saved");
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  }

  function addColumn() {
    setConfig(prev => ({
      ...prev,
      columns: [...prev.columns, { title: "New Column", links: [] }]
    }));
  }

  function removeColumn(colIndex: number) {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== colIndex)
    }));
  }

  function addLink(colIndex: number) {
    const newCols = [...config.columns];
    newCols[colIndex].links.push({ label: "New Link", url: "/" });
    setConfig(prev => ({ ...prev, columns: newCols }));
  }

  function updateLink(colIndex: number, linkIndex: number, field: keyof LinkItem, val: string) {
    const newCols = [...config.columns];
    newCols[colIndex].links[linkIndex][field] = val;
    setConfig(prev => ({ ...prev, columns: newCols }));
  }

  function removeLink(colIndex: number, linkIndex: number) {
    const newCols = [...config.columns];
    newCols[colIndex].links.splice(linkIndex, 1);
    setConfig(prev => ({ ...prev, columns: newCols }));
  }

  function updateSocial(index: number, val: string) {
    const newSoc = [...config.socials];
    newSoc[index].url = val;
    setConfig(prev => ({ ...prev, socials: newSoc }));
  }

  if (loading) return <div className="p-8 text-[var(--cream-muted)] text-sm animate-pulse">Loading footer config...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
            <Settings2 className="h-7 w-7 text-[var(--accent)]" />
            Footer Builder
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">Customize the nested columns, newsletter, and social links.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Config"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--cream)]">Columns & Links</h2>
              <button onClick={addColumn} className="text-xs flex items-center gap-1 text-[var(--accent)] hover:opacity-80">
                <Plus className="h-3 w-3" /> Add Column
              </button>
            </div>
            
            <div className="space-y-4">
              {config.columns.map((col, colIndex) => (
                <div key={colIndex} className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-white/5 border-b border-white/5">
                    <GripVertical className="h-4 w-4 text-white/20" />
                    <input 
                      value={col.title}
                      onChange={e => {
                        const newCols = [...config.columns];
                        newCols[colIndex].title = e.target.value;
                        setConfig(prev => ({...prev, columns: newCols}));
                      }}
                      className="bg-transparent border-none text-sm font-semibold text-[var(--cream)] outline-none flex-1 placeholder:text-white/30"
                      placeholder="Column Title"
                    />
                    <button onClick={() => removeColumn(colIndex)} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    {col.links.map((link, linkIndex) => (
                      <div key={linkIndex} className="flex gap-2 items-center">
                        <input 
                          value={link.label}
                          onChange={e => updateLink(colIndex, linkIndex, 'label', e.target.value)}
                          placeholder="Label (e.g. Home)"
                          className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-[var(--cream)]"
                        />
                        <input 
                          value={link.url}
                          onChange={e => updateLink(colIndex, linkIndex, 'url', e.target.value)}
                          placeholder="URL (e.g. /home)"
                          className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-[var(--cream)]"
                        />
                        <button onClick={() => removeLink(colIndex, linkIndex)} className="text-white/40 hover:text-red-400 p-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addLink(colIndex)} className="text-xs text-[var(--cream-muted)] hover:text-white py-1.5 flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add Link
                    </button>
                  </div>
                </div>
              ))}
              {config.columns.length === 0 && (
                <p className="text-xs text-[var(--cream-muted)] text-center py-4">No columns added yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--cream)]">Newsletter Box</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Title</label>
                <input 
                  value={config.newsletter.title}
                  onChange={e => setConfig(prev => ({ ...prev, newsletter: { ...prev.newsletter, title: e.target.value } }))}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Description</label>
                <textarea 
                  value={config.newsletter.description}
                  onChange={e => setConfig(prev => ({ ...prev, newsletter: { ...prev.newsletter, description: e.target.value } }))}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-[var(--cream)] resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Button Text</label>
                <input 
                  value={config.newsletter.buttonText}
                  onChange={e => setConfig(prev => ({ ...prev, newsletter: { ...prev.newsletter, buttonText: e.target.value } }))}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--cream)]">Social & Copyright</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Copyright Text</label>
                <input 
                  value={config.copyright}
                  onChange={e => setConfig(prev => ({ ...prev, copyright: e.target.value }))}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]"
                />
              </div>
              
              <div className="pt-2">
                <label className="text-xs text-[var(--cream-muted)] block mb-2">Social Profile URLs (Leave empty to hide icon)</label>
                {config.socials.map((soc, i) => (
                  <div key={soc.platform} className="flex items-center gap-3 mb-2">
                    <span className="w-20 text-xs text-[var(--cream-muted)] capitalize inline-block">{soc.platform}</span>
                    <input 
                      value={soc.url}
                      onChange={e => updateSocial(i, e.target.value)}
                      placeholder={`https://${soc.platform}.com/yourpage`}
                      className="flex-1 rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-[var(--cream)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
