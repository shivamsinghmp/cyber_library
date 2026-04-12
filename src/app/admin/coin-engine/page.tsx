"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Coins, Check, AlertTriangle, Book, Search, User as UserIcon, Calendar as CalendarIcon, TrendingUp, TrendingDown } from "lucide-react";

type ActionReward = {
  actionKey: string;
  label: string;
  coins: number;
  isActive: boolean;
};

const DEFAULT_RULES: ActionReward[] = [
  { actionKey: "25M_FOCUS_SESSION", label: "25m Focus Session", coins: 25, isActive: true },
  { actionKey: "POMODORO_CYCLE_COMPLETED", label: "Pomodoro Cycle Completed", coins: 2, isActive: true },
  { actionKey: "QUIZ_CORRECT", label: "Correct Quiz Answer", coins: 1, isActive: true },
  { actionKey: "TODO_COMPLETED", label: "Completed a Daily Task", coins: 1, isActive: true },
  { actionKey: "STREAK_MAINTAINED", label: "Maintained Study Streak", coins: 1, isActive: true },
  { actionKey: "TAB_AWAY_VIOLATION", label: "Tab Away Penalty", coins: -1, isActive: true },
];

export default function CoinEnginePage() {
  const [rules, setRules] = useState<ActionReward[]>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Passbook State
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchRules();
    searchPassbook("");
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coin-engine");
      const data = await res.json();
      if (res.ok && data.length > 0) {
        const merged = DEFAULT_RULES.map(defaultRule => {
          const found = data.find((r: any) => r.actionKey === defaultRule.actionKey);
          return found ? { ...defaultRule, ...found } : defaultRule;
        });
        setRules(merged);
      }
    } catch {
      toast.error("Failed to fetch current coin rules.");
    } finally {
      setLoading(false);
    }
  }

  function handleRuleChange(index: number, field: keyof ActionReward, value: any) {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  }

  async function saveRules() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coin-engine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      if (res.ok) {
        toast.success("Coin Engine synchronized!");
      } else {
        toast.error("Failed to sync rules.");
      }
    } catch {
      toast.error("Failed to sync rules.");
    } finally {
      setSaving(false);
    }
  }

  async function searchPassbook(q: string = searchQuery) {
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/coin-engine/passbook?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch {
      toast.error("Failed to fetch passbook entries.");
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cream)] tracking-tight">Coin Management Engine</h1>
        <p className="mt-2 text-sm text-[var(--cream-muted)] leading-relaxed">
          Control exactly how many coins are awarded (or deducted) dynamically across the system. Values update instantly in real-time.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur-md">
        {loading ? (
          <p className="text-[var(--cream-muted)] text-sm animate-pulse">Loading Engine Core...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule, idx) => (
                <div 
                  key={rule.actionKey} 
                  className={`rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-black/50 hover:shadow-xl hover:border-[var(--accent)]/50 ${!rule.isActive && "opacity-60 grayscale"}`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider text-[var(--wood)] uppercase bg-[var(--wood)]/10 px-2 py-1 rounded">
                      <Coins className="h-3 w-3" />
                      {rule.actionKey.replace(/_/g, " ")}
                    </span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={rule.isActive}
                        onChange={(e) => handleRuleChange(idx, "isActive", e.target.checked)}
                      />
                      <div className="h-5 w-9 rounded-full bg-white/10 peer-checked:bg-[var(--accent)] peer-focus:outline-none transition-colors"></div>
                      <div className="absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-full"></div>
                    </label>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-[var(--cream-muted)] font-medium mb-1 block">Display Label</label>
                      <input 
                        type="text" 
                        value={rule.label}
                        onChange={(e) => handleRuleChange(idx, "label", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--cream)] shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-[var(--cream-muted)] font-medium mb-1 block">Coin Algorithm Output</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={rule.coins}
                          onChange={(e) => handleRuleChange(idx, "coins", parseInt(e.target.value) || 0)}
                          className={`w-full bg-black/60 rounded-xl border border-white/10 pl-10 pr-4 py-3 text-2xl font-black tracking-tighter outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all ${rule.coins < 0 ? "text-red-400" : "text-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.1)_inset]"}`}
                        />
                        <Coins className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${rule.coins < 0 ? "text-red-500/50" : "text-amber-500/50"}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/10 pt-6 mt-8 gap-4">
              <p className="text-xs text-amber-500/80 flex items-center gap-1.5 font-medium bg-amber-500/10 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" /> 
                Pushing changes will instantly re-route the economy values across the platform.
              </p>
              
              <button 
                onClick={saveRules}
                disabled={saving}
                className="flex items-center gap-2 shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--ink)] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:scale-105 hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] disabled:opacity-50 disabled:hover:scale-100"
              >
                <Check className="h-5 w-5" />
                {saving ? "Synchronizing Matrix..." : "Sync Engine Core"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Passbook View */}
      <div className="rounded-2xl border border-white/10 bg-black/30 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="border-b border-white/10 bg-black/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Book className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--cream)] tracking-tight">Coin Passbook Log</h2>
              <p className="text-xs text-[var(--cream-muted)]">Live audit of economy transactions</p>
            </div>
          </div>
          
          <form 
            onSubmit={(e) => { e.preventDefault(); searchPassbook(); }} 
            className="relative w-full md:w-80"
          >
            <input 
              type="text" 
              placeholder="Search by Mobile, Email, or Entry ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 rounded-xl border border-white/10 pl-10 pr-4 py-2 text-sm text-[var(--cream)] outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-[var(--cream-muted)]/50"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--cream-muted)]" />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => { setSearchQuery(""); searchPassbook(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cream-muted)] hover:text-white"
              >
                ×
              </button>
            )}
          </form>
        </div>

        <div className="p-0 overflow-x-auto">
          {searchLoading ? (
            <div className="p-10 flex justify-center">
              <span className="text-[var(--cream-muted)] text-sm animate-pulse flex items-center gap-2">
                <Search className="h-4 w-4" /> Querying Ledgers...
              </span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-[var(--cream-muted)]">No transactions found matching your search.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-[var(--cream)]">
              <thead className="bg-black/40 text-xs uppercase text-[var(--cream-muted)] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap"><CalendarIcon className="inline h-3 w-3 mr-1" /> Date</th>
                  <th className="px-6 py-4 font-medium"><UserIcon className="inline h-3 w-3 mr-1" /> Student</th>
                  <th className="px-6 py-4 font-medium">System Trigger</th>
                  <th className="px-6 py-4 font-medium text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[var(--cream-muted)]">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--cream)] flex items-center gap-2">
                        {log.user?.profile?.fullName || "Student"}
                        <span className="text-[10px] font-mono text-[var(--wood)] bg-[var(--wood)]/10 px-1.5 py-0.5 rounded">
                          {log.userId}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--cream-muted)] flex flex-wrap gap-2 mt-1">
                        <span>{log.user?.email}</span>
                        {log.user?.profile?.phone && <span className="text-white/30">•</span>}
                        {log.user?.profile?.phone && <span>{log.user?.profile?.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/40 px-2.5 py-1 text-xs font-medium text-[var(--cream-muted)] group-hover:text-white transition-colors">
                        <Book className="h-3 w-3 opacity-50" />
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${log.coins > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {log.coins > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {log.coins > 0 ? "+" : ""}{log.coins}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
