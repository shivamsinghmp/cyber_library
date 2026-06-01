"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, Save, Eye, EyeOff, Loader2, CheckCircle2,
  AlertCircle, BarChart2, Bell, MessageSquare, Mail,
  Calendar, Zap, Settings2, Cpu, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

type SettingMeta = { label: string; secret: boolean; value: string | null; hasValue: boolean };
type AllSettings = Record<string, SettingMeta>;

type SectionConfig = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  keys: string[];
};

const SECTIONS: SectionConfig[] = [
  {
    id: "analytics",
    title: "Analytics & Tracking",
    subtitle: "Google Analytics, Tag Manager, AdSense, Facebook Pixel",
    icon: BarChart2,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    keys: ["GOOGLE_ANALYTICS_ID", "GOOGLE_TAG_MANAGER_ID", "GOOGLE_ADSENSE_ID", "FB_PIXEL_ID", "CUSTOM_HEAD_HTML"],
  },
  {
    id: "site",
    title: "Site Config",
    subtitle: "Announcement banner, support contacts, gamification",
    icon: Bell,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    keys: ["ANNOUNCEMENT", "SUPPORT_EMAIL", "SUPPORT_WHATSAPP_NUMBER", "WHATSAPP_GROUP_LINK", "CHECKIN_COINS", "NEXTAUTH_URL"],
  },
  {
    id: "whatsapp",
    title: "WhatsApp API",
    subtitle: "Meta Business API credentials and OTP template",
    icon: MessageSquare,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    keys: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_OTP_TEMPLATE_NAME", "WHATSAPP_OTP_TEMPLATE_LANG"],
  },
  {
    id: "email",
    title: "Email (Resend)",
    subtitle: "Transactional email via Resend",
    icon: Mail,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    keys: ["RESEND_API_KEY", "RESEND_FROM"],
  },
  {
    id: "calendar",
    title: "Google Calendar",
    subtitle: "Service account for auto-creating study room events",
    icon: Calendar,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    keys: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_CALENDAR_ID", "GOOGLE_CALENDAR_OWNER_EMAIL"],
  },
  {
    id: "meetaddon",
    title: "Meet Add-on Features",
    subtitle: "Toggle realtime, focus guard, and gamification features",
    icon: Zap,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    keys: ["MEET_ADDON_REALTIME_ENABLED", "MEET_ADDON_FOCUS_GUARD_ENABLED", "MEET_ADDON_GAMIFICATION_ENABLED"],
  },
  {
    id: "system",
    title: "System",
    subtitle: "Cron jobs, SMS, Razorpay, pricing data",
    icon: Settings2,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    keys: ["CRON_SECRET", "FAST2SMS_API_KEY", "PRICING_DATA", "FOOTER_CONFIG_JSON"],
  },
  {
    id: "vertex",
    title: "Vertex AI (Legacy)",
    subtitle: "Legacy Google Cloud Vertex AI — use AI API Keys page for new setup",
    icon: Cpu,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    keys: ["VERTEX_PROJECT_ID", "VERTEX_LOCATION", "VERTEX_API_KEY"],
  },
];

function SettingRow({
  settingKey,
  meta,
  value,
  onChange,
  onSave,
  saving,
}: {
  settingKey: string;
  meta: SettingMeta;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const isSecret = meta.secret;
  const isLongText = settingKey.includes("JSON") || settingKey.includes("HTML") || settingKey === "GOOGLE_PRIVATE_KEY" || settingKey === "PRICING_DATA";

  return (
    <div className="group rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-gray-400 truncate">{settingKey}</span>
            {meta.hasValue ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> set
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                <AlertCircle className="h-3 w-3" /> not set
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-700">{meta.label}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          {isLongText ? (
            <textarea
              rows={3}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={isSecret ? "••••••••" : `Enter ${meta.label.toLowerCase()}…`}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
            />
          ) : (
            <input
              type={isSecret && !visible ? "password" : "text"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={isSecret ? "••••••••" : `Enter value…`}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          )}
          {isSecret && !isLongText && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}

function Section({
  section,
  settings,
  values,
  savingKey,
  onValueChange,
  onSaveKey,
}: {
  section: SectionConfig;
  settings: AllSettings;
  values: Record<string, string>;
  savingKey: string | null;
  onValueChange: (key: string, val: string) => void;
  onSaveKey: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const Icon = section.icon;
  const sectionKeys = section.keys.filter((k) => k in settings);
  const setCount = sectionKeys.filter((k) => settings[k]?.hasValue).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${section.iconBg}`}>
            <Icon className={`h-4.5 w-4.5 ${section.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{section.title}</p>
            <p className="text-xs text-gray-500">{section.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">
            {setCount}/{sectionKeys.length} set
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && sectionKeys.length > 0 && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
          {sectionKeys.map((key) => (
            <SettingRow
              key={key}
              settingKey={key}
              meta={settings[key]}
              value={values[key] ?? ""}
              onChange={(v) => onValueChange(key, v)}
              onSave={() => onSaveKey(key)}
              saving={savingKey === key}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AllSettings>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data: AllSettings = await res.json();
      setSettings(data);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        initial[k] = v.secret ? "" : (v.value ?? "");
      }
      setValues(initial);
    } catch {
      toast.error("Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleValueChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveKey = async (key: string) => {
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, value: values[key]?.trim() || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(`${settings[key]?.label ?? key} saved`);
      // Refresh the hasValue status for this key
      setSettings((prev) => ({
        ...prev,
        [key]: { ...prev[key], hasValue: !!values[key]?.trim() },
      }));
    } catch {
      toast.error(`Failed to save ${key}`);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-24 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-16">

      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Admin
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Platform Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure integrations, analytics, and platform behaviour. Each setting is saved individually.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
          <Link href="/admin/virtual-library" className="rounded-full border border-gray-200 px-3 py-1 hover:bg-gray-50 transition">
            → Site Branding
          </Link>
          <Link href="/admin/ai-settings" className="rounded-full border border-gray-200 px-3 py-1 hover:bg-gray-50 transition">
            → AI API Keys
          </Link>
          <Link href="/admin/footer" className="rounded-full border border-gray-200 px-3 py-1 hover:bg-gray-50 transition">
            → Footer Config
          </Link>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <Section
          key={section.id}
          section={section}
          settings={settings}
          values={values}
          savingKey={savingKey}
          onValueChange={handleValueChange}
          onSaveKey={handleSaveKey}
        />
      ))}
    </div>
  );
}
