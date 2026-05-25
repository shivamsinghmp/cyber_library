"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Coins, Check, AlertTriangle, Book, Search, User as UserIcon, Calendar as CalendarIcon, TrendingUp, TrendingDown, Gift, Minus, Plus } from "lucide-react";

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

  // Checkin coins setting
  const [checkinCoins, setCheckinCoins] = useState(5);
  const [checkinInput, setCheckinInput] = useState(5);
  const [savingCheckin, setSavingCheckin] = useState(false);

  // Manual Award State
  const [awardUserId, setAwardUserId] = useState("");
  const [awardAmount, setAwardAmount] = useState(0);
  const [awardReason, setAwardReason] = useState("");
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    fetchRules();
    searchPassbook("");
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coin-engine");
      const data = await res.json();
      if (res.ok) {
        const rulesArr = data.rules ?? data; // backwards compat
        if (Array.isArray(rulesArr) && rulesArr.length > 0) {
          const merged = DEFAULT_RULES.map(defaultRule => {
            const found = rulesArr.find((r: any) => r.actionKey === defaultRule.actionKey);
            return found ? { ...defaultRule, ...found } : defaultRule;
          });
          setRules(merged);
        }
        if (data.checkinCoins != null) {
          setCheckinCoins(data.checkinCoins);
          setCheckinInput(data.checkinCoins);
        }
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

  async function saveCheckinCoins(e: React.FormEvent) {
    e.preventDefault();
    if (checkinInput < 1) { toast.error("Minimum 1 coin hona chahiye"); return; }
    setSavingCheckin(true);
    try {
      const res = await fetch("/api/admin/coin-engine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinCoins: checkinInput }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      setCheckinCoins(data.checkinCoins);
      toast.success(`Daily check-in coins updated to ${data.checkinCoins}`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingCheckin(false);
    }
  }

  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    if (!awardUserId.trim() || !awardAmount || !awardReason.trim()) {
      toast.error("Sabhi fields fill karo");
      return;
    }
    setAwarding(true);
    try {
      const res = await fetch("/api/admin/coin-engine/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: awardUserId.trim(), amount: awardAmount, reason: awardReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(`Done! New balance: ${data.newBalance} coins`);
      setAwardUserId("");
      setAwardAmount(0);
      setAwardReason("");
      searchPassbook("");
    } catch {
      toast.error("Failed to award coins");
    } finally {
      setAwarding(false);
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

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl backdrop-blur-md">
        {loading ? (
          <p className="text-[var(--cream-muted)] text-sm animate-pulse">Loading Engine Core...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule, idx) => (
                <div 
                  key={rule.actionKey} 
                  className={`rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-all hover:bg-gray-100 hover:shadow-xl hover:border-indigo-300 ${!rule.isActive && "opacity-60 grayscale"}`}
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
                      <div className="h-5 w-9 rounded-full bg-gray-100 peer-checked:bg-[var(--accent)] peer-focus:outline-none transition-colors"></div>
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
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[var(--cream)] shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-[var(--cream-muted)] font-medium mb-1 block">Coin Algorithm Output</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={rule.coins}
                          onChange={(e) => handleRuleChange(idx, "coins", parseInt(e.target.value) || 0)}
                          className={`w-full bg-gray-100 rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-2xl font-black tracking-tighter outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all ${rule.coins < 0 ? "text-red-700" : "text-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.1)_inset]"}`}
                        />
                        <Coins className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${rule.coins < 0 ? "text-red-500/50" : "text-amber-500/50"}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 pt-6 mt-8 gap-4">
              <p className="text-xs text-amber-500/80 flex items-center gap-1.5 font-medium bg-amber-50 px-3 py-2 rounded-lg">
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

      {/* Daily Check-in Coins Config */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--cream)]">Daily Check-in Coins</h2>
            <p className="text-xs text-[var(--cream-muted)]">Student roz login karne pe kitne coins milenge — currently <strong>{checkinCoins}</strong> coins</p>
          </div>
        </div>
        <form onSubmit={saveCheckinCoins} className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">Coins per Day</label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              <input
                type="number"
                min={1}
                max={1000}
                value={checkinInput}
                onChange={(e) => setCheckinInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-36 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-xl font-black text-amber-500 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <p className="mt-1 text-[10px] text-[var(--cream-muted)]">7-day streak = +20 · 30-day = +100</p>
          </div>
          <button
            type="submit"
            disabled={savingCheckin || checkinInput === checkinCoins}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] shadow-md transition-all hover:bg-amber-400 disabled:opacity-50 mb-5"
          >
            <Check className="h-4 w-4" />
            {savingCheckin ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      {/* Manual Coin Award / Deduct */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--cream)]">Manual Coin Award / Deduct</h2>
            <p className="text-xs text-[var(--cream-muted)]">Kisi bhi student ko directly coins do ya kaato — ledger sync rahega</p>
          </div>
        </div>
        <form onSubmit={handleAward} className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">User ID</label>
            <input
              type="text"
              placeholder="Student ka User ID (DB)"
              value={awardUserId}
              onChange={(e) => setAwardUserId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">
              Amount <span className="text-red-400">(negative = deduct)</span>
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              <input
                type="number"
                value={awardAmount || ""}
                onChange={(e) => setAwardAmount(parseInt(e.target.value) || 0)}
                placeholder="e.g. 50 or -10"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">Reason</label>
            <input
              type="text"
              placeholder="e.g. Bonus, Contest win"
              value={awardReason}
              onChange={(e) => setAwardReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={awarding || !awardUserId || !awardAmount || !awardReason}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${
                awardAmount < 0
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-amber-400 text-amber-900 hover:bg-amber-500 shadow-md"
              }`}
            >
              {awardAmount < 0 ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {awarding ? "Processing…" : awardAmount < 0 ? "Deduct Coins" : "Award Coins"}
            </button>
          </div>
        </form>
      </div>

      {/* Passbook View */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="border-b border-gray-200 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
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
              className="w-full bg-gray-100 rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm text-[var(--cream)] outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-300"
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
            <table className="w-full text-left text-sm text-gray-900">
              <thead className="bg-white text-xs uppercase text-[var(--cream-muted)] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap"><CalendarIcon className="inline h-3 w-3 mr-1" /> Date</th>
                  <th className="px-6 py-4 font-medium"><UserIcon className="inline h-3 w-3 mr-1" /> Student</th>
                  <th className="px-6 py-4 font-medium">System Trigger</th>
                  <th className="px-6 py-4 font-medium text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                        {log.user?.profile?.phone && <span className="text-gray-400">•</span>}
                        {log.user?.profile?.phone && <span>{log.user?.profile?.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-2.5 py-1 text-xs font-medium text-[var(--cream-muted)] group-hover:text-white transition-colors">
                        <Book className="h-3 w-3 opacity-50" />
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${log.coins > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
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
