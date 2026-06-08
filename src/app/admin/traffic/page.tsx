"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Activity, Calendar, Users, Smartphone, Monitor, Globe, Link2, LayoutList, RefreshCw, Share2, Copy, Check } from "lucide-react";
import { getDeviceLabel } from "@/lib/deviceType";

/* ─── types ─────────────────────────────────────────────────────────────── */
type Visit = {
  id: string; ip: string; deviceType: string; path: string | null;
  country: string | null; city: string | null; referrer: string | null;
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
  createdAt: string;
};
type DayPoint = { date: string; visits: number; uniqueIps: number };
type CountItem = { country?: string; referrer?: string; page?: string; visits: number };

type TrafficData = {
  activeNow: number; last7Days: number; last30Days: number;
  graphByDay: DayPoint[];
  topCountries: { country: string; visits: number }[];
  topReferrers: { referrer: string; visits: number }[];
  topPages: { page: string; visits: number }[];
  topUtmSources: { source: string; visits: number }[];
  from?: string; to?: string;
  visits?: Visit[];
  rangeGraphByDay?: DayPoint[];
  rangeTopCountries?: { country: string; visits: number }[];
  rangeTopReferrers?: { referrer: string; visits: number }[];
  rangeTopPages?: { page: string; visits: number }[];
  rangeTopUtmSources?: { source: string; visits: number }[];
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
function countryFlag(code: string): string {
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(0x1f1e0 - 65 + c.charCodeAt(0))
  );
}

function fmtDate(iso: string) {
  return iso.slice(5); // MM-DD
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  MOBILE: <Smartphone className="h-4 w-4" />,
  TABLET: <Smartphone className="h-4 w-4" />,
  LAPTOP: <Monitor className="h-4 w-4" />,
  DESKTOP: <Monitor className="h-4 w-4" />,
};

const CHART_COLORS = {
  visits: "#6366f1",
  unique: "#10b981",
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/* ─── sub-components ─────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number; sub: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function BreakdownList({ items, keyField, icon, label, total }: {
  items: CountItem[]; keyField: "country" | "referrer" | "page";
  icon: React.ReactNode; label: string; total: number;
}) {
  if (!items.length) return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon}{label}
      </h3>
      <p className="text-xs text-gray-400">No data for this period.</p>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon}{label}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const key = item[keyField] as string;
          const pct = total > 0 ? Math.round((item.visits / total) * 100) : 0;
          return (
            <li key={key ?? i}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 truncate text-gray-700 max-w-[70%]">
                  {keyField === "country" && key !== "(unknown)" && (
                    <span>{countryFlag(key)}</span>
                  )}
                  <span className="truncate" title={key}>{key}</span>
                </span>
                <span className="font-semibold text-gray-900">{item.visits.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── UTM link generator ─────────────────────────────────────────────────── */
const PLATFORMS = [
  { id: "whatsapp",  label: "WhatsApp",  emoji: "💬" },
  { id: "telegram",  label: "Telegram",  emoji: "✈️" },
  { id: "facebook",  label: "Facebook",  emoji: "📘" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "twitter",   label: "Twitter/X", emoji: "🐦" },
  { id: "email",     label: "Email",     emoji: "📧" },
  { id: "youtube",   label: "YouTube",   emoji: "▶️" },
  { id: "sms",       label: "SMS",       emoji: "💬" },
];

function UtmGenerator() {
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const [page, setPage] = useState("/");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);

  const siteUrl = "https://cyberlib.in";
  const params = new URLSearchParams({ utm_source: platform, utm_medium: "social" });
  if (campaign.trim()) params.set("utm_campaign", campaign.trim());
  const finalUrl = `${siteUrl}${page.startsWith("/") ? page : "/" + page}?${params.toString()}`;

  function handleCopy() {
    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Share2 className="h-5 w-5 text-indigo-500" />
          UTM Link Generator
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Generate a share-ready link in one click — the platform will track it automatically.
        </p>
      </div>

      {/* Platform selector */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-gray-500">Platform chunno</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                platform === p.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {/* Page / path */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Page (optional)</label>
          <input
            type="text"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="/pricing"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        {/* Campaign name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Campaign name (optional)</label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="may-launch"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Generated link */}
      <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
        <span className="flex-1 truncate font-mono text-xs text-indigo-800">{finalUrl}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            copied
              ? "bg-emerald-500 text-white"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-gray-400">
        Copy and share this link on WhatsApp / Telegram / Facebook — clicks will appear under <strong>Campaign Sources</strong> in the admin panel.
      </p>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────────────────── */
export default function AdminTrafficPage() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rangeApplied, setRangeApplied] = useState(false);

  const fetchTraffic = useCallback(async (fromDate?: string, toDate?: string) => {
    setLoading(true);
    try {
      let url = "/api/admin/traffic";
      if (fromDate && toDate) url += `?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTraffic(); }, [fetchTraffic]);

  function handleApply() {
    if (from && to) { fetchTraffic(from, to); setRangeApplied(true); }
  }

  function handleReset() {
    setFrom(""); setTo(""); setRangeApplied(false); fetchTraffic();
  }

  // Use range data when applied, else last-30-day defaults
  const graph = rangeApplied ? (data?.rangeGraphByDay ?? []) : (data?.graphByDay ?? []);
  const countries = rangeApplied ? (data?.rangeTopCountries ?? []) : (data?.topCountries ?? []);
  const referrers = rangeApplied ? (data?.rangeTopReferrers ?? []) : (data?.topReferrers ?? []);
  const pages = rangeApplied ? (data?.rangeTopPages ?? []) : (data?.topPages ?? []);
  const utmSources = rangeApplied ? (data?.rangeTopUtmSources ?? []) : (data?.topUtmSources ?? []);
  const totalVisits = graph.reduce((s, d) => s + d.visits, 0);

  // Device breakdown from visits (only available in range mode)
  const deviceData = (() => {
    const m = new Map<string, number>();
    for (const v of data?.visits ?? []) {
      m.set(v.deviceType, (m.get(v.deviceType) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name: getDeviceLabel(name), value }));
  })();

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">Loading traffic data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:py-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Website Traffic</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Real-time visitor analytics · last 30 days by default
          </p>
        </div>
        <button
          onClick={() => fetchTraffic(from || undefined, to || undefined)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
          label="Active right now"
          value={data?.activeNow ?? 0}
          sub="Unique IPs in last 5 min"
          color="bg-emerald-50"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-indigo-600" />}
          label="Last 7 days"
          value={data?.last7Days ?? 0}
          sub="Total page views"
          color="bg-indigo-50"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-amber-600" />}
          label="Last 30 days"
          value={data?.last30Days ?? 0}
          sub="Total page views"
          color="bg-amber-50"
        />
      </div>

      {/* Area chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Page Views Over Time</h2>
            <p className="text-xs text-gray-400">
              {rangeApplied && data?.from && data?.to
                ? `${data.from} → ${data.to}`
                : "Last 30 days"}
            </p>
          </div>
          {/* Date range picker */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-gray-400">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-gray-400">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !from || !to}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-indigo-700"
            >
              Apply
            </button>
            {rangeApplied && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {graph.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            No data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={graph} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.visits} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.visits} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gUnique" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.unique} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.unique} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="visits" name="Page Views" stroke={CHART_COLORS.visits} strokeWidth={2} fill="url(#gVisits)" dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="uniqueIps" name="Unique IPs" stroke={CHART_COLORS.unique} strokeWidth={2} fill="url(#gUnique)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdowns row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Top Countries */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <BreakdownList
            items={countries}
            keyField="country"
            icon={<Globe className="h-4 w-4 text-indigo-500" />}
            label="Top Countries"
            total={totalVisits}
          />
        </div>

        {/* Traffic Sources (referrer) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <BreakdownList
            items={referrers}
            keyField="referrer"
            icon={<Link2 className="h-4 w-4 text-indigo-500" />}
            label="Referrer Sources"
            total={totalVisits}
          />
        </div>

        {/* UTM Sources (WhatsApp / Telegram / Facebook etc.) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {utmSources.length === 0 ? (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Share2 className="h-4 w-4 text-indigo-500" />
                Campaign Sources
              </h3>
              <p className="text-xs text-gray-400">No UTM links clicked yet.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                Share links like:<br />
                <code className="font-mono text-gray-500">?utm_source=whatsapp</code><br />
                <code className="font-mono text-gray-500">?utm_source=telegram</code>
              </p>
            </div>
          ) : (
            <BreakdownList
              items={utmSources.map((u) => ({ referrer: u.source, visits: u.visits }))}
              keyField="referrer"
              icon={<Share2 className="h-4 w-4 text-indigo-500" />}
              label="Campaign Sources"
              total={totalVisits}
            />
          )}
        </div>

        {/* Top Pages */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <BreakdownList
            items={pages}
            keyField="page"
            icon={<LayoutList className="h-4 w-4 text-indigo-500" />}
            label="Top Pages"
            total={totalVisits}
          />
        </div>
      </div>

      {/* UTM Link Generator */}
      <UtmGenerator />

      {/* Device split (only when range visits available) + Visits table */}
      {data?.visits && data.visits.length > 0 && (
        <>
          {/* Device pie + visit count */}
          {deviceData.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <Monitor className="h-4 w-4 text-indigo-500" />
                Device Breakdown
              </h2>
              <div className="flex flex-wrap items-center gap-8">
                <PieChart width={160} height={160}>
                  <Pie data={deviceData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                </PieChart>
                <ul className="space-y-2">
                  {deviceData.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-700">{d.name}</span>
                      <span className="font-semibold text-gray-900">{d.value.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Visits table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Individual Visits
                <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  {data.visits.length.toLocaleString()}{data.visits.length === 2000 ? "+" : ""}
                </span>
              </h2>
              {data.visits.length === 2000 && (
                <p className="mt-0.5 text-xs text-gray-400">Showing latest 2 000 visits — narrow the date range to see more.</p>
              )}
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-left">
                  <tr className="border-b border-gray-100">
                    {["IP", "Location", "Device", "Path", "Referrer", "Campaign", "Time"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.visits.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{v.ip}</td>
                      <td className="px-4 py-2.5">
                        {v.country ? (
                          <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                            <span>{countryFlag(v.country)}</span>
                            <span>{v.city ? `${v.city}, ${v.country}` : v.country}</span>
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          {DEVICE_ICONS[v.deviceType] ?? <Monitor className="h-4 w-4" />}
                          {getDeviceLabel(v.deviceType)}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-2.5 text-xs text-gray-500" title={v.path ?? undefined}>
                        {v.path || "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-2.5 text-xs text-gray-500" title={v.referrer ?? "(direct)"}>
                        {v.referrer ?? <span className="italic text-gray-400">(direct)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {v.utmSource ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                            <Share2 className="h-3 w-3" />
                            {v.utmSource}
                            {v.utmMedium ? ` / ${v.utmMedium}` : ""}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-400">
                        {new Date(v.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state when no range applied */}
      {!data?.visits && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Select a date range above to see individual visits, device breakdown, and per-page stats.</p>
        </div>
      )}
    </div>
  );
}
