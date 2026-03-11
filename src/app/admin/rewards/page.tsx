"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Plus, Pencil, Trash2, UserPlus, CheckCircle } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  enrollmentAmount: number;
  type: string;
  isActive: boolean;
  createdAt: string;
  _count?: { winners: number };
};

type Winner = {
  id: string;
  userId: string;
  rewardId: string;
  status: string;
  wonAt: string;
  paidAt: string | null;
  user: { id: string; name: string | null; email: string; studentId: string | null };
  reward: { id: string; name: string; amount: number; type: string };
};

const REWARD_TYPES = ["STREAK", "REFERRAL", "CONTEST", "STUDY", "OTHER"];

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [addWinnerOpen, setAddWinnerOpen] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string | null; email: string; studentId: string | null }[]>([]);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState(0);
  const [formEnrollmentAmount, setFormEnrollmentAmount] = useState(0);
  const [formType, setFormType] = useState("OTHER");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [winnerRewardId, setWinnerRewardId] = useState("");
  const [winnerUserId, setWinnerUserId] = useState("");
  const [winnerNotes, setWinnerNotes] = useState("");
  const [studyLeaderboard, setStudyLeaderboard] = useState<{ rank: number; userId: string; name: string; email: string; studentId: string | null; studyHours: number }[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"week" | "month">("week");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const fetchRewards = useCallback(async () => {
    const res = await fetch("/api/admin/rewards", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setRewards(Array.isArray(data) ? data : []);
    }
  }, []);

  const fetchWinners = useCallback(async () => {
    const res = await fetch("/api/admin/rewards/winners", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setWinners(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchRewards(), fetchWinners()]);
      const sRes = await fetch("/api/admin/students", { credentials: "include" });
      if (sRes.ok) {
        const sData = await sRes.json();
        setStudents(Array.isArray(sData) ? sData : []);
      }
      setLoading(false);
    })();
  }, [fetchRewards, fetchWinners]);

  function openCreate() {
    setFormName("");
    setFormDesc("");
    setFormAmount(0);
    setFormEnrollmentAmount(0);
    setFormType("OTHER");
    setFormActive(true);
    setEditReward(null);
    setCreateOpen(true);
  }

  function openEdit(r: Reward) {
    setEditReward(r);
    setFormName(r.name);
    setFormDesc(r.description ?? "");
    setFormAmount(r.amount);
    setFormEnrollmentAmount(r.enrollmentAmount ?? 0);
    setFormType(r.type);
    setFormActive(r.isActive);
    setCreateOpen(false);
  }

  async function handleSaveReward(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editReward) {
        const res = await fetch(`/api/admin/rewards/${editReward.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDesc || null,
            amount: formAmount,
            enrollmentAmount: formEnrollmentAmount,
            type: formType,
            isActive: formActive,
          }),
        });
        if (res.ok) {
          toast.success("Reward updated.");
          setEditReward(null);
          fetchRewards();
        } else toast.error("Failed to update.");
      } else {
        const res = await fetch("/api/admin/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDesc || undefined,
            amount: formAmount,
            enrollmentAmount: formEnrollmentAmount,
            type: formType,
            isActive: formActive,
          }),
        });
        if (res.ok) {
          toast.success("Reward created.");
          setCreateOpen(false);
          fetchRewards();
        } else toast.error("Failed to create.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteReward(id: string) {
    if (!confirm("Delete this reward? Winners linked to it will also be removed.")) return;
    const res = await fetch(`/api/admin/rewards/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Reward deleted.");
      fetchRewards();
      fetchWinners();
    } else toast.error("Failed to delete.");
  }

  function openAddWinner() {
    setWinnerRewardId(rewards[0]?.id ?? "");
    setWinnerUserId("");
    setWinnerNotes("");
    setStudyLeaderboard([]);
    setAddWinnerOpen(true);
  }

  async function fetchStudyLeaderboard() {
    setLeaderboardLoading(true);
    try {
      const res = await fetch(`/api/admin/study-leaderboard?period=${leaderboardPeriod}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStudyLeaderboard(data.leaderboard ?? []);
      } else {
        setStudyLeaderboard([]);
      }
    } catch {
      setStudyLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  async function handleAddWinner(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerRewardId || !winnerUserId) {
      toast.error("Select reward and student.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rewards/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: winnerUserId, rewardId: winnerRewardId, notes: winnerNotes || undefined }),
      });
      if (res.ok) {
        toast.success("Winner added. They will see the reward in My Rewards.");
        setAddWinnerOpen(false);
        fetchWinners();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error ?? "Failed to add winner.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(w: Winner) {
    const res = await fetch(`/api/admin/rewards/winners/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) {
      toast.success("Marked as paid.");
      fetchWinners();
    } else toast.error("Failed.");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-center text-[var(--cream-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Reward Program</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">Create rewards; add winners who get the amount.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openAddWinner}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <UserPlus className="h-4 w-4" />
            Add Winner
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
          >
            <Plus className="h-4 w-4" />
            Create Reward
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Gift className="h-5 w-5 text-[var(--accent)]" />
          Rewards
        </h2>
        {rewards.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--cream-muted)]">No rewards yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Name</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Description</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Prize (₹)</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Enroll (₹)</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Winners</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-medium text-[var(--cream)]">{r.name}</td>
                    <td className="max-w-[180px] py-2.5 pr-3 text-xs text-[var(--cream-muted)] truncate" title={r.description ?? undefined}>{r.description || "—"}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[var(--accent)]">₹{r.amount}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">₹{r.enrollmentAmount ?? 0}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">{r._count?.winners ?? 0}</td>
                    <td className="py-2.5">
                      <button type="button" onClick={() => openEdit(r)} className="mr-2 rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDeleteReward(r.id)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--cream)]">Winners</h2>
        {winners.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--cream-muted)]">No winners yet. Add a winner above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Winner</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Reward</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Amount</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Won at</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Status</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Action</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w) => (
                  <tr key={w.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-[var(--cream)]">{w.user.name || "—"}</p>
                      <p className="text-xs text-[var(--cream-muted)]">{w.user.email}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{w.reward.name}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[var(--accent)]">₹{w.reward.amount}</td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--cream-muted)]">{new Date(w.wonAt).toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.status === "PAID" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {w.status !== "PAID" && (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(w)}
                          className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={createOpen || !!editReward} title={editReward ? "Edit reward" : "Create reward"} onClose={() => { setCreateOpen(false); setEditReward(null); }}>
        <form onSubmit={handleSaveReward} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Description</label>
            <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Prize amount (₹) — what winner receives *</label>
            <input type="number" min={0} value={formAmount} onChange={(e) => setFormAmount(Number(e.target.value) || 0)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Enrollment amount (₹) — student pays to enroll</label>
            <input type="number" min={0} value={formEnrollmentAmount} onChange={(e) => setFormEnrollmentAmount(Number(e.target.value) || 0)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]">
              {REWARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--cream-muted)]">
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
            Active
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setCreateOpen(false); setEditReward(null); }} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={addWinnerOpen} title="Add winner" onClose={() => setAddWinnerOpen(false)}>
        <form onSubmit={handleAddWinner} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Reward *</label>
            <select value={winnerRewardId} onChange={(e) => setWinnerRewardId(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]">
              {rewards.filter((r) => r.isActive).map((r) => (
                <option key={r.id} value={r.id}>{r.name} (₹{r.amount})</option>
              ))}
              {rewards.filter((r) => r.isActive).length === 0 && <option value="">No active rewards</option>}
            </select>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-xs font-medium text-[var(--cream-muted)]">Pick from study leaderboard (sabse zyada study)</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                value={leaderboardPeriod}
                onChange={(e) => { setLeaderboardPeriod(e.target.value as "week" | "month"); setStudyLeaderboard([]); }}
                className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-[var(--cream)]"
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
              <button
                type="button"
                onClick={fetchStudyLeaderboard}
                disabled={leaderboardLoading}
                className="rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-3 py-1.5 text-sm font-medium text-[var(--cream)] hover:bg-[var(--accent)]/20 disabled:opacity-50"
              >
                {leaderboardLoading ? "Loading…" : "Load leaderboard"}
              </button>
            </div>
            {studyLeaderboard.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-black/60">
                    <tr className="border-b border-white/10 text-left">
                      <th className="py-1.5 pr-2 font-medium text-[var(--cream-muted)]">#</th>
                      <th className="py-1.5 pr-2 font-medium text-[var(--cream-muted)]">Name</th>
                      <th className="py-1.5 pr-2 font-medium text-[var(--cream-muted)]">Study hrs</th>
                      <th className="py-1.5 font-medium text-[var(--cream-muted)]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studyLeaderboard.map((row) => (
                      <tr key={row.userId} className="border-b border-white/5">
                        <td className="py-1.5 pr-2 font-medium text-[var(--cream)]">#{row.rank}</td>
                        <td className="py-1.5 pr-2 text-[var(--cream)]">{row.name}</td>
                        <td className="py-1.5 pr-2 text-[var(--accent)]">{row.studyHours}h</td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => setWinnerUserId(row.userId)}
                            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300 hover:bg-emerald-500/20"
                          >
                            Set #{row.rank} as winner
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {winnerUserId && (
              <p className="mt-2 text-xs text-emerald-400">Selected student for winner. Submit below to add.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Student *</label>
            <select value={winnerUserId} onChange={(e) => setWinnerUserId(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]">
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.email} ({s.studentId || s.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Notes</label>
            <input value={winnerNotes} onChange={(e) => setWinnerNotes(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" placeholder="Optional" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setAddWinnerOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Adding…" : "Add winner"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
