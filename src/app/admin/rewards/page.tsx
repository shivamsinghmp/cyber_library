"use client";

import { useState } from "react";
import { Gift, UserPlus, CheckCircle } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import { useFetch } from "@/hooks/useFetch";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  FormActions,
  RowActions,
  FormInput,
  FormSelect,
  FormCheckbox,
} from "@/components/ui";
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

type Student = { id: string; name: string | null; email: string; studentId: string | null };
type LeaderboardRow = { rank: number; userId: string; name: string; email: string; studentId: string | null; studyHours: number };

const REWARD_TYPES = ["STREAK", "REFERRAL", "CONTEST", "STUDY", "OTHER"];
const defaultForm = { name: "", description: "", amount: 0, enrollmentAmount: 0, type: "OTHER", isActive: true };

export default function AdminRewardsPage() {
  const crud = useAdminCRUD<Reward>({
    listUrl: "/api/admin/rewards",
    onCreateSuccess: "Reward created.",
    onUpdateSuccess: "Reward updated.",
    onDeleteSuccess: "Reward deleted.",
    confirmDeleteMessage: () => "Delete this reward? Winners linked to it will also be removed.",
  });

  const { data: winners, loading: winnersLoading, refetch: refetchWinners } = useFetch<Winner[]>("/api/admin/rewards/winners");
  const { data: students } = useFetch<Student[]>("/api/admin/students");

  const [form, setForm] = useState(defaultForm);
  const [addWinnerOpen, setAddWinnerOpen] = useState(false);
  const [winnerRewardId, setWinnerRewardId] = useState("");
  const [winnerUserId, setWinnerUserId] = useState("");
  const [winnerNotes, setWinnerNotes] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"week" | "month">("week");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [winnerSaving, setWinnerSaving] = useState(false);

  function openCreate() {
    setForm(defaultForm);
    crud.openCreate();
  }

  function openEdit(r: Reward) {
    setForm({ name: r.name, description: r.description ?? "", amount: r.amount, enrollmentAmount: r.enrollmentAmount ?? 0, type: r.type, isActive: r.isActive });
    crud.openEdit(r);
  }

  function buildPayload() {
    return { name: form.name, description: form.description || null, amount: form.amount, enrollmentAmount: form.enrollmentAmount, type: form.type, isActive: form.isActive };
  }

  function openAddWinner() {
    setWinnerRewardId(crud.items.find((r) => r.isActive)?.id ?? "");
    setWinnerUserId("");
    setWinnerNotes("");
    setLeaderboard([]);
    setAddWinnerOpen(true);
  }

  async function fetchLeaderboard() {
    setLeaderboardLoading(true);
    try {
      const res = await fetch(`/api/admin/study-leaderboard?period=${leaderboardPeriod}`, { credentials: "include" });
      if (res.ok) setLeaderboard((await res.json()).leaderboard ?? []);
      else setLeaderboard([]);
    } catch { setLeaderboard([]); }
    finally { setLeaderboardLoading(false); }
  }

  async function handleAddWinner(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerRewardId || !winnerUserId) { toast.error("Select reward and student."); return; }
    setWinnerSaving(true);
    try {
      const res = await fetch("/api/admin/rewards/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: winnerUserId, rewardId: winnerRewardId, notes: winnerNotes || undefined }),
      });
      if (res.ok) {
        toast.success("Winner added.");
        setAddWinnerOpen(false);
        refetchWinners();
      } else {
        toast.error((await res.json().catch(() => ({}))).error ?? "Failed to add winner.");
      }
    } finally { setWinnerSaving(false); }
  }

  async function handleMarkPaid(w: Winner) {
    const res = await fetch(`/api/admin/rewards/winners/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) { toast.success("Marked as paid."); refetchWinners(); }
    else toast.error("Failed.");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      <AdminPageHeader
        title="Reward Program"
        description="Create rewards; add winners who get the amount."
        addLabel="Create Reward"
        onAdd={openCreate}
        extra={
          <button type="button" onClick={openAddWinner} className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">
            <UserPlus className="h-4 w-4" /> Add Winner
          </button>
        }
      />

      {/* Rewards table */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Gift className="h-5 w-5 text-[var(--accent)]" /> Rewards
        </h2>
        <AdminTable loading={crud.loading} empty={crud.items.length === 0} emptyText="No rewards yet. Create one above.">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <AdminTh>Name</AdminTh><AdminTh>Description</AdminTh><AdminTh>Prize (₹)</AdminTh><AdminTh>Enroll (₹)</AdminTh><AdminTh>Winners</AdminTh><AdminTh>Actions</AdminTh>
            </tr>
          </thead>
          <tbody>
            {crud.items.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <AdminTd className="font-medium text-gray-900">{r.name}</AdminTd>
                <AdminTd className="max-w-[180px] truncate text-xs" title={r.description ?? undefined}>{r.description || "—"}</AdminTd>
                <AdminTd className="font-semibold text-[var(--accent)]">₹{r.amount}</AdminTd>
                <AdminTd className="text-gray-900">₹{r.enrollmentAmount ?? 0}</AdminTd>
                <AdminTd>{r._count?.winners ?? 0}</AdminTd>
                <AdminTd><RowActions onEdit={() => openEdit(r)} onDelete={() => crud.handleDelete(r)} /></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>

      {/* Winners table */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Winners</h2>
        <AdminTable loading={winnersLoading} empty={(winners ?? []).length === 0} emptyText="No winners yet. Add a winner above.">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <AdminTh>Winner</AdminTh><AdminTh>Reward</AdminTh><AdminTh>Amount</AdminTh><AdminTh>Won at</AdminTh><AdminTh>Status</AdminTh><AdminTh>Action</AdminTh>
            </tr>
          </thead>
          <tbody>
            {(winners ?? []).map((w) => (
              <tr key={w.id} className="border-b border-gray-100">
                <AdminTd>
                  <p className="font-medium text-gray-900">{w.user.name || "—"}</p>
                  <p className="text-xs text-[var(--cream-muted)]">{w.user.email}</p>
                </AdminTd>
                <AdminTd className="text-gray-900">{w.reward.name}</AdminTd>
                <AdminTd className="font-semibold text-[var(--accent)]">₹{w.reward.amount}</AdminTd>
                <AdminTd className="text-xs">{new Date(w.wonAt).toLocaleString()}</AdminTd>
                <AdminTd>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{w.status}</span>
                </AdminTd>
                <AdminTd>
                  {w.status !== "PAID" && (
                    <button type="button" onClick={() => handleMarkPaid(w)} className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle className="h-3 w-3" /> Mark paid
                    </button>
                  )}
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>

      {/* Reward form modal */}
      <Modal isOpen={crud.createOpen || !!crud.editItem} title={crud.editItem ? "Edit reward" : "Create reward"} onClose={crud.closeModals}>
        <form onSubmit={async (e) => { e.preventDefault(); crud.editItem ? await crud.handleUpdate(buildPayload()) : await crud.handleCreate(buildPayload()); }} className="space-y-4">
          <FormInput label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <FormInput label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <FormInput label="Prize amount (₹) — what winner receives *" type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
          <FormInput label="Enrollment amount (₹) — student pays to enroll" type="number" min={0} value={form.enrollmentAmount} onChange={(e) => setForm({ ...form, enrollmentAmount: Number(e.target.value) || 0 })} />
          <FormSelect label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
          <FormCheckbox id="reward-active" label="Active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <FormActions onCancel={crud.closeModals} saving={crud.saving} isEdit={!!crud.editItem} />
        </form>
      </Modal>

      {/* Add winner modal */}
      <Modal isOpen={addWinnerOpen} title="Add winner" onClose={() => setAddWinnerOpen(false)}>
        <form onSubmit={handleAddWinner} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Reward *</label>
            <select value={winnerRewardId} onChange={(e) => setWinnerRewardId(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
              {crud.items.filter((r) => r.isActive).map((r) => <option key={r.id} value={r.id}>{r.name} (₹{r.amount})</option>)}
              {crud.items.filter((r) => r.isActive).length === 0 && <option value="">No active rewards</option>}
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Pick from study leaderboard</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select value={leaderboardPeriod} onChange={(e) => { setLeaderboardPeriod(e.target.value as "week" | "month"); setLeaderboard([]); }} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900">
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
              <button type="button" onClick={fetchLeaderboard} disabled={leaderboardLoading} className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-[var(--cream)] hover:bg-indigo-100 disabled:opacity-50">
                {leaderboardLoading ? "Loading…" : "Load leaderboard"}
              </button>
            </div>
            {leaderboard.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-1.5 pr-2 text-xs font-semibold text-gray-500">#</th>
                      <th className="py-1.5 pr-2 text-xs font-semibold text-gray-500">Name</th>
                      <th className="py-1.5 pr-2 text-xs font-semibold text-gray-500">Study hrs</th>
                      <th className="py-1.5 text-xs font-semibold text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr key={row.userId} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2 font-medium text-gray-900">#{row.rank}</td>
                        <td className="py-1.5 pr-2 text-gray-900">{row.name}</td>
                        <td className="py-1.5 pr-2 text-[var(--accent)]">{row.studyHours}h</td>
                        <td className="py-1.5">
                          <button type="button" onClick={() => setWinnerUserId(row.userId)} className="rounded border border-emerald-500/40 bg-emerald-50 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100">Select</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {winnerUserId && <p className="mt-2 text-xs text-emerald-700">Student selected. Submit below to add.</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Student *</label>
            <select value={winnerUserId} onChange={(e) => setWinnerUserId(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="">Select student</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.name || s.email} ({s.studentId || s.email})</option>)}
            </select>
          </div>
          <FormInput label="Notes" value={winnerNotes} onChange={(e) => setWinnerNotes(e.target.value)} placeholder="Optional" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setAddWinnerOpen(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900">Cancel</button>
            <button type="submit" disabled={winnerSaving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{winnerSaving ? "Adding…" : "Add winner"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
