"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, User, Tag, Send, GraduationCap, Receipt, BookOpen, ShoppingBag, Flame, Clock } from "lucide-react";
import toast from "react-hot-toast";

type Activity = { id: string; type: string; content: string; authorName: string | null; createdAt: string };
type Contact = {
  id: string; name: string | null; email: string | null; phone: string | null;
  stage: string; source: string; sourceUserId: string | null; assignedToId: string | null; assigneeName: string | null;
  createdAt: string; activities: Activity[];
};
type TeamMember = { id: string; name: string | null; email: string };

type StudentProfile = {
  id: string; studentId: string | null; name: string | null; email: string; goal: string | null; createdAt: string;
  profile: {
    fullName: string | null; phone: string | null; whatsappNumber: string | null; studyGoal: string | null;
    targetExam: string | null; totalStudyHours: number; currentStreak: number; longestStreak: number; coinBalance: number;
  } | null;
  attendanceDays: number;
  transactions: { id: string; transactionId: string; amount: number; status: string; createdAt: string }[];
  subscriptions: { id: string; slotName: string; timeLabel: string; createdAt: string }[];
  digitalPurchases: { id: string; productName: string; productPrice: number; purchasedAt: string }[];
};

const STAGES = ["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"] as const;
const STAGE_LABELS: Record<string, string> = {
  NEW: "New", CONTACTED: "Contacted", TRIAL: "Trial", CONVERTED: "Converted", LOST: "Lost",
};
const SOURCE_LABELS: Record<string, string> = {
  LEAD_SUBMISSION: "Form lead", SIGNUP: "Signup", MANUAL: "Manual",
};

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      const [contactRes, teamRes] = await Promise.all([
        fetch(`/api/admin/pipeline/${params.id}`, { credentials: "include" }),
        fetch("/api/admin/team", { credentials: "include" }),
      ]);
      if (contactRes.status === 404) { toast.error("Contact not found."); router.push("/admin/pipeline"); return; }
      if (contactRes.ok) {
        const data: Contact = await contactRes.json();
        setContact(data);
        setForm({ name: data.name ?? "", email: data.email ?? "", phone: data.phone ?? "" });
      }
      if (teamRes.ok) setTeam((await teamRes.json()).team ?? []);
    } catch { toast.error("Failed to load contact."); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { fetchContact(); }, [fetchContact]);

  // If this contact came from a real signup, pull the full student profile
  // (study hours, coins, transactions, subscriptions) so sales staff don't
  // need a separate lookup tool.
  useEffect(() => {
    if (!contact?.sourceUserId) return;
    setStudentLoading(true);
    fetch(`/api/admin/pipeline/${params.id}/student`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { student: null })
      .then(d => setStudent(d.student ?? null))
      .catch(() => setStudent(null))
      .finally(() => setStudentLoading(false));
  }, [contact?.sourceUserId, params.id]);

  async function patch(data: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/pipeline/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) { fetchContact(); return true; }
      toast.error("Update failed.");
      return false;
    } catch { toast.error("Update failed."); return false; }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await patch(form);
    if (ok) toast.success("Saved.");
    setSaving(false);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/pipeline/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.trim() }),
      });
      if (res.ok) { setNote(""); fetchContact(); }
      else toast.error("Failed to add note.");
    } catch { toast.error("Failed to add note."); }
    finally { setNoteSaving(false); }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!contact) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/pipeline" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Pipeline
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Details</h2>
            <form onSubmit={handleSaveDetails} className="space-y-3">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><User className="h-3.5 w-3.5" /> Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Mail className="h-3.5 w-3.5" /> Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Phone className="h-3.5 w-3.5" /> Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full rounded-xl py-2 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #9A3412, #C2410C)" }}>
                {saving ? "Saving…" : "Save Details"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Pipeline</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Stage</label>
                <select value={contact.stage} onChange={e => patch({ stage: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Assigned to</label>
                <select value={contact.assignedToId ?? ""} onChange={e => patch({ assignedToId: e.target.value || null })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                  <option value="">Unassigned</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                </select>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Tag className="h-3.5 w-3.5" /> Source: {SOURCE_LABELS[contact.source] ?? contact.source}
              </p>
              <p className="text-xs text-gray-400">Added {new Date(contact.createdAt).toLocaleString()}</p>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {contact.sourceUserId && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                <GraduationCap className="h-4 w-4 text-orange-600" /> Student Profile
              </h2>
              {studentLoading ? (
                <p className="text-sm text-gray-400">Loading student data…</p>
              ) : !student ? (
                <p className="text-sm text-gray-400">Linked account no longer exists.</p>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="text-gray-500">Student ID:</span> <span className="font-mono text-gray-900">{student.studentId ?? "—"}</span></p>
                    <p><span className="text-gray-500">Name:</span> <span className="text-gray-900">{student.name || student.profile?.fullName || "—"}</span></p>
                    <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{student.email}</span></p>
                    <p><span className="text-gray-500">Phone / WhatsApp:</span> <span className="text-gray-900">{student.profile?.whatsappNumber || student.profile?.phone || "—"}</span></p>
                    <p><span className="text-gray-500">Target exam:</span> <span className="text-gray-900">{student.profile?.targetExam || student.goal || "—"}</span></p>
                    <p><span className="text-gray-500">Joined:</span> <span className="text-gray-900">{new Date(student.createdAt).toLocaleDateString()}</span></p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">{student.profile?.coinBalance ?? 0}</p>
                      <p className="text-[10px] font-semibold text-amber-600">COINS</p>
                    </div>
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
                      <Flame className="mx-auto mb-0.5 h-4 w-4 text-orange-600" />
                      <p className="text-lg font-bold text-orange-700">{student.profile?.currentStreak ?? 0}</p>
                      <p className="text-[10px] font-semibold text-orange-600">DAY STREAK</p>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                      <Clock className="mx-auto mb-0.5 h-4 w-4 text-blue-600" />
                      <p className="text-lg font-bold text-blue-700">{Math.round(student.profile?.totalStudyHours ?? 0)}h</p>
                      <p className="text-[10px] font-semibold text-blue-600">STUDY TIME</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                      <p className="text-lg font-bold text-emerald-700">{student.attendanceDays}</p>
                      <p className="text-[10px] font-semibold text-emerald-600">ATTENDANCE DAYS</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <Receipt className="h-3.5 w-3.5" /> Transactions ({student.transactions.length})
                    </h3>
                    {student.transactions.length === 0 ? (
                      <p className="text-sm text-gray-400">No transactions.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {student.transactions.slice(0, 5).map(t => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-mono text-gray-700">{t.transactionId}</span>
                            <span className="font-semibold text-orange-700">₹{t.amount}</span>
                            <span className="text-gray-500">{t.status}</span>
                            <span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <BookOpen className="h-3.5 w-3.5" /> Subscriptions ({student.subscriptions.length})
                      </h3>
                      {student.subscriptions.length === 0 ? (
                        <p className="text-sm text-gray-400">None.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {student.subscriptions.map(s => (
                            <li key={s.id} className="flex justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <span className="text-gray-700">{s.slotName}</span>
                              <span className="text-gray-400">{s.timeLabel}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <ShoppingBag className="h-3.5 w-3.5" /> Digital Purchases ({student.digitalPurchases.length})
                      </h3>
                      {student.digitalPurchases.length === 0 ? (
                        <p className="text-sm text-gray-400">None.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {student.digitalPurchases.map(p => (
                            <li key={p.id} className="flex justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <span className="text-gray-700">{p.productName}</span>
                              <span className="text-gray-400">₹{p.productPrice}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Activity Timeline</h2>
            <form onSubmit={handleAddNote} className="mb-5 flex gap-2">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              <button type="submit" disabled={noteSaving || !note.trim()}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #9A3412, #C2410C)" }}>
                <Send className="h-3.5 w-3.5" /> Add
              </button>
            </form>

            {contact.activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {contact.activities.map(a => (
                  <div key={a.id} className={`rounded-xl border p-3 ${a.type === "STAGE_CHANGE" ? "border-violet-100 bg-violet-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">{a.authorName || "System"}</span>
                      <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
