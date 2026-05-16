"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Calendar, Users, Smartphone, Monitor } from "lucide-react";
import { getDeviceLabel } from "@/lib/deviceType";

type TrafficSummary = {
  activeNow: number;
  last7Days: number;
  last30Days: number;
  from?: string;
  to?: string;
  visits?: { id: string; ip: string; deviceType: string; path: string | null; createdAt: string }[];
  graphByDay?: { date: string; visits: number; uniqueIps: number }[];
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  MOBILE: <Smartphone className="h-4 w-4" />,
  TABLET: <Smartphone className="h-4 w-4" />,
  LAPTOP: <Monitor className="h-4 w-4" />,
  DESKTOP: <Monitor className="h-4 w-4" />,
};

export default function AdminTrafficPage() {
  const [data, setData] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchTraffic = useCallback(async (fromDate?: string, toDate?: string) => {
    setLoading(true);
    try {
      let url = "/api/admin/traffic";
      if (fromDate && toDate) url += `?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  function handleApplyRange() {
    if (from && to) fetchTraffic(from, to);
  }

  const graph = data?.graphByDay ?? [];
  const maxVisits = Math.max(1, ...graph.map((d) => d.visits));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:py-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Website Traffic</h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Active visitors, weekly & monthly counts. Select date range for detailed data with IP and device type.
        </p>
      </div>

      {loading && !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-[var(--cream-muted)]">
          Loading…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Active now</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.activeNow ?? 0}</p>
                  <p className="text-[10px] text-[var(--cream-muted)]">Unique IPs (last 5 min)</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Last 7 days</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.last7Days ?? 0}</p>
                  <p className="text-[10px] text-[var(--cream-muted)]">Page views</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Last 30 days</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.last30Days ?? 0}</p>
                  <p className="text-[10px] text-[var(--cream-muted)]">Page views</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calendar className="h-5 w-5 text-[var(--accent)]" />
              Date range – full data with IP & device
            </h2>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--cream-muted)]">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--cream-muted)]">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyRange}
                disabled={loading || !from || !to}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
              >
                {loading ? "Loading…" : "Apply"}
              </button>
            </div>

            {data?.from && data?.to && (
              <>
                {graph.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-medium text-gray-900">Traffic graph (visits per day)</h3>
                    <div className="flex items-end justify-between gap-1 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      {graph.map((d) => (
                        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full min-h-[6px] rounded-t bg-[var(--accent)]/70 transition-all"
                            style={{ height: `${Math.max(8, (d.visits / maxVisits) * 120)}px` }}
                            title={`${d.date}: ${d.visits} visits, ${d.uniqueIps} unique IPs`}
                          />
                          <span className="text-[10px] text-[var(--cream-muted)]">{d.date.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className="mb-2 text-sm font-medium text-gray-900">Visits (IP, device, path, time)</h3>
                {!data.visits?.length ? (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
                    No visits in this range.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="border-b border-gray-200 text-left">
                          <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">IP</th>
                          <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Device</th>
                          <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Path</th>
                          <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.visits.map((v) => (
                          <tr key={v.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-mono text-gray-900">{v.ip}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1.5 text-gray-900">
                                {DEVICE_ICONS[v.deviceType] ?? <Monitor className="h-4 w-4" />}
                                {getDeviceLabel(v.deviceType)}
                              </span>
                            </td>
                            <td className="max-w-[200px] truncate py-2 px-3 text-[var(--cream-muted)]" title={v.path ?? undefined}>
                              {v.path || "—"}
                            </td>
                            <td className="py-2 px-3 text-xs text-[var(--cream-muted)]">
                              {new Date(v.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {data.visits?.length === 2000 && (
                  <p className="mt-2 text-xs text-[var(--cream-muted)]">Showing latest 2000 visits. Narrow the date range for more.</p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
