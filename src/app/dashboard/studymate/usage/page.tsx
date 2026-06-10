"use client";

import { useEffect, useState } from "react";
import { Zap, Coins, MessageSquare, Clock, TrendingUp, BarChart3, ArrowLeft } from "lucide-react";
import Link from "next/link";

type UsageStats = {
  today:    { calls: number; totalCoins: number; totalTokens: number; avgLatencyMs: number; byModel: Record<string, { calls: number; coins: number; tokens: number }> };
  month:    { calls: number; totalCoins: number; totalTokens: number; avgLatencyMs: number; byModel: Record<string, { calls: number; coins: number; tokens: number }> };
  allTime:  { calls: number; totalCoins: number; totalTokens: number; byModel: Record<string, { calls: number; coins: number; tokens: number }> };
  coinBalance:    number;
  dailyCoinLimit: number | null;
  totalSessions:  number;
  todaySpent:     number;
  dailyRemaining: number | null;
};

function fmtK(n: number) { return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }
function fmtMs(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`; }

const MODEL_EMOJI: Record<string, string> = {
  "gemini": "⚡",  "claude": "🧠",  "gpt": "🤖",
};
function modelEmoji(m: string) {
  if (m.startsWith("gemini")) return "⚡";
  if (m.startsWith("claude")) return "🧠";
  return "🤖";
}

export default function StudyMateUsagePage() {
  const [data, setData]   = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/studymate/usage")
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#6367FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-[var(--muted-text)]">Failed to load usage data.</div>
  );

  const dailyPct = data.dailyCoinLimit ? Math.min(100, (data.todaySpent / data.dailyCoinLimit) * 100) : null;

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/studymate" className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[var(--muted-text)]" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#6367FF]" /> My AI Usage
          </h1>
          <p className="text-sm text-[var(--muted-text)]">Your StudyMate AI usage statistics</p>
        </div>
      </div>

      {/* Daily budget bar */}
      {data.dailyCoinLimit != null && (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">Today's Budget</span>
            <span className="text-sm font-bold text-[#6367FF]">{data.todaySpent} / {data.dailyCoinLimit} 🪙</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${dailyPct! >= 90 ? "bg-red-400" : dailyPct! >= 70 ? "bg-amber-400" : "bg-[#6367FF]"}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
          <p className="text-xs text-[var(--muted-text)] mt-1">
            {data.dailyRemaining != null ? `${data.dailyRemaining} coins remaining today` : "No limit set"}
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Coin Balance",    value: `${data.coinBalance}🪙`,       icon: Coins,         color: "text-amber-500" },
          { label: "Total Sessions",  value: String(data.totalSessions),     icon: MessageSquare, color: "text-[#6367FF]" },
          { label: "Calls This Month",value: String(data.month.calls),       icon: TrendingUp,    color: "text-emerald-500" },
          { label: "Avg Latency",     value: fmtMs(data.month.avgLatencyMs), icon: Clock,         color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-[var(--muted-text)]">{label}</span>
            </div>
            <p className="text-xl font-bold text-[var(--foreground)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Today + Month side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: "Today",      stats: data.today },
          { title: "This Month", stats: data.month },
        ].map(({ title, stats }) => (
          <div key={title} className="bg-white rounded-2xl border border-[var(--border)] p-5 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#6367FF]" />{title}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Calls",    value: String(stats.calls) },
                { label: "Coins",    value: `${stats.totalCoins}🪙` },
                { label: "Tokens",   value: fmtK(stats.totalTokens) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F5F4FF] rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-[#6367FF]/70 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-bold text-[#1A1447] mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Per-model breakdown */}
            {Object.keys(stats.byModel).length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-[10px] text-[var(--muted-text)] uppercase tracking-wide font-semibold">By Model</p>
                {Object.entries(stats.byModel)
                  .sort((a, b) => b[1].calls - a[1].calls)
                  .map(([model, s]) => (
                    <div key={model} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-[var(--foreground)] font-medium">
                        <span>{modelEmoji(model)}</span>
                        <span className="truncate max-w-[120px]">{model}</span>
                      </span>
                      <span className="text-[var(--muted-text)] flex-shrink-0">
                        {s.calls} calls · {s.coins}🪙
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {/* All-time */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
        <h2 className="text-sm font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#6367FF]" /> All-Time Stats
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Calls",   value: String(data.allTime.calls) },
            { label: "Coins Spent",   value: `${data.allTime.totalCoins}🪙` },
            { label: "Total Tokens",  value: fmtK(data.allTime.totalTokens) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#F5F4FF] rounded-xl p-3 text-center">
              <p className="text-[10px] text-[#6367FF]/70 uppercase tracking-wide">{label}</p>
              <p className="text-base font-bold text-[#1A1447] mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pb-4">
        <Link href="/dashboard/wallet/buy-coins"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6367FF] text-white text-sm font-semibold hover:bg-[#4f52d3] transition-colors shadow-sm">
          <Coins className="w-4 h-4" /> Buy More Coins
        </Link>
      </div>
    </div>
  );
}
