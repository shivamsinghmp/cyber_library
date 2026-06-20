"use client";

import { useState, useEffect } from "react";
import { Save, Bot, Power } from "lucide-react";
import toast from "react-hot-toast";

type BotSettings = {
  enabled: boolean;
  systemPrompt: string;
  defaultModel: string;
  budgetMode: "strict" | "balanced" | "quality";
  rateLimitPerMin: number;
  availableModels: string[];
  pricing: Record<string, number>;
};

// All models the registry knows about — shown in the dropdown even when not
// currently usable, so the admin understands *why* an option is disabled.
const ALL_MODELS = [
  "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-1.5-pro",
  "claude-haiku", "claude-sonnet", "claude-opus",
  "gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-4o",
];

export function BotSettingsTab() {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/whatsapp/bot-settings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BotSettings | null) => { if (d) setSettings(d); })
      .catch(() => toast.error("Failed to load bot settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp/bot-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: settings.enabled,
          systemPrompt: settings.systemPrompt,
          defaultModel: settings.defaultModel,
          budgetMode: settings.budgetMode,
          rateLimitPerMin: settings.rateLimitPerMin,
        }),
      });
      if (res.ok) toast.success("Bot settings saved!");
      else toast.error("Save failed");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-14 text-center text-sm text-[var(--cream-muted)] animate-pulse">Loading bot settings…</div>;
  }
  if (!settings) {
    return <div className="py-14 text-center text-sm text-red-600">Failed to load bot settings.</div>;
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-[var(--foreground)]">
            <Bot className="h-5 w-5 text-[var(--accent)]" />
            WhatsApp AI Bot Settings
          </h2>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Controls the interactive AI bot that replies to student WhatsApp messages. Changes apply to the next inbound message (no redeploy needed).
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--ink)] hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <label className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <Power className="h-4 w-4" /> Bot enabled
        </span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          className="h-5 w-5 accent-[var(--accent)]"
        />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">
          Extra system prompt instructions
        </p>
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
          rows={6}
          placeholder="Appended to the bot's base instructions — e.g. tone tweaks, current announcements. Never replaces the base safety/formatting rules."
          className="w-full rounded-2xl border border-[var(--border)] bg-gray-50 px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] resize-y leading-relaxed"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">
            Default model (ceiling)
          </p>
          <select
            value={settings.defaultModel}
            onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            {ALL_MODELS.map((m) => (
              <option key={m} value={m} disabled={!settings.availableModels.includes(m)}>
                {m}{!settings.availableModels.includes(m) ? " (no API key configured)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">
            The bot picks the best-fit model up to this cost — it can pick something cheaper, never pricier.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Budget mode</p>
          <select
            value={settings.budgetMode}
            onChange={(e) => setSettings({ ...settings, budgetMode: e.target.value as BotSettings["budgetMode"] })}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="strict">Strict (cheapest)</option>
            <option value="balanced">Balanced (tier-based)</option>
            <option value="quality">Quality (best fit)</option>
          </select>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">
          Rate limit (replies per user per minute)
        </p>
        <input
          type="number"
          min={1}
          max={60}
          value={settings.rateLimitPerMin}
          onChange={(e) => setSettings({ ...settings, rateLimitPerMin: Number(e.target.value) || 1 })}
          className="w-32 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </div>
    </div>
  );
}
