"use client";

import { useState, useEffect } from "react";
import {
  UserPlus, Link2, Copy, Gift, Users, CheckCircle2,
  XCircle, Loader2, Share2, ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

type ReferredUser = {
  id: string; name: string; email: string; joinedAt: string;
  rewarded: boolean; active: boolean;
};

type ReferralData = {
  referralCode:  string | null;
  referralLink:  string | null;
  referredCount: number;
  activeCount:   number;
  inactiveCount: number;
  referredUsers: ReferredUser[];
};

const PAGE_SIZE = 10;

const HOW_STEPS = [
  { icon: Link2,    label: "Apna Code Lo",    desc: "Unique referral code aur link generate karo" },
  { icon: Share2,   label: "Dosto Ko Share Karo", desc: "Link unhe bhejo jo seriously padhna chahte hain" },
  { icon: Gift,     label: "Rewards Kamao",   desc: "Jab wo join karein toh reward milega" },
];

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Active</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-500"><XCircle className="h-3 w-3" />Inactive</span>;
}

export default function ReferPage() {
  const [data, setData]             = useState<ReferralData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [page, setPage]             = useState(1);

  useEffect(() => {
    fetch("/api/user/referral", { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: Partial<ReferralData>) => setData({
        referralCode:  d.referralCode  ?? null,
        referralLink:  d.referralLink  ?? null,
        referredCount: d.referredCount ?? 0,
        activeCount:   d.activeCount   ?? 0,
        inactiveCount: d.inactiveCount ?? 0,
        referredUsers: Array.isArray(d.referredUsers) ? d.referredUsers : [],
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res  = await fetch("/api/user/referral", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        setData(prev => prev ? {
          ...prev,
          referralCode: json.referralCode ?? prev.referralCode,
          referralLink: json.referralLink ?? prev.referralLink,
        } : null);
        toast.success("Referral link ready! Share karo dosto ke saath.");
      } else {
        toast.error(json.error || "Link generate nahi ho saka");
      }
    } catch { toast.error("Kuch gadbad ho gayi. Try karo."); }
    finally { setGenerating(false); }
  }

  function copyLink() {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink)
      .then(() => toast.success("Link copy ho gaya!"))
      .catch(() => toast.error("Copy fail ho gaya"));
  }

  function copyCode() {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode)
      .then(() => toast.success("Code copy ho gaya!"))
      .catch(() => toast.error("Copy fail ho gaya"));
  }

  function shareOnWhatsApp() {
    if (!data?.referralLink) return;
    const text = `Hey! Yeh amazing online study library join karo — I use it for my exam prep. Use my referral link: ${data.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  const users      = data?.referredUsers ?? [];
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginated  = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Mera Referral</h1>
          <p className="text-xs text-[var(--muted-text)]">Dosto ko invite karo aur rewards kamao</p>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {HOW_STEPS.map(({ icon: Icon, label, desc }, i) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
              <Icon className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--muted-text)] uppercase tracking-widest mb-0.5">Step {i + 1}</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
              <p className="text-xs text-[var(--muted-text)] mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      {data?.referralCode && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Referrals", value: data.referredCount,  color: "text-[var(--accent)]" },
            { label: "Active Students", value: data.activeCount,    color: "text-emerald-600" },
            { label: "Inactive",        value: data.inactiveCount,  color: "text-red-500" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[var(--muted-text)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral Code Card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">Mera Referral Code</h2>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center gap-3 py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm text-[var(--muted-text)]">Loading…</span>
            </div>
          ) : !data?.referralCode ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center mx-auto">
                <Link2 className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Apna referral link generate karo</p>
                <p className="text-xs text-[var(--muted-text)] max-w-sm mx-auto leading-relaxed">
                  Ek baar generate karo — phir har dost ko share karo aur unka data yahan track hoga.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold transition-all shadow-[var(--shadow-brand)] disabled:opacity-60"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {generating ? "Generate ho raha hai…" : "Generate Referral Link"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Code display */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--accent-border)] bg-[var(--accent-pale)] px-5 py-3.5">
                  <span className="font-mono text-xl font-black text-[var(--accent)] tracking-widest select-all">{data.referralCode}</span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </button>
                </div>
              </div>

              {/* Share link */}
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-gray-50 px-4 py-3">
                <p className="flex-1 font-mono text-xs text-gray-600 truncate select-all">{data.referralLink}</p>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <Copy className="w-3 h-3" /> Copy Link
                </button>
              </div>

              {/* WhatsApp share */}
              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-bold py-3 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp pe Share Karo
              </button>

              <p className="text-xs text-[var(--muted-text)] text-center">
                Jitne log is link se register karenge, unka data neeche table mein dikh jayega.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Referrals Table */}
      {data?.referralCode && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-[var(--foreground)]">Mere Referrals</h2>
            </div>
            <span className="text-xs font-semibold text-[var(--muted-text)] bg-[var(--page-bg)] border border-[var(--border)] px-2 py-0.5 rounded-full">{users.length}</span>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[var(--foreground)]">Abhi koi referral nahi</p>
              <p className="text-xs text-[var(--muted-text)] mt-1">Upar wala link share karo — jab koi sign up kare, yahan dikhega.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      {["#", "Student Name", "Email", "Join Date", "Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((u, i) => (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">
                              {u.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[140px]">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(u.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3"><StatusBadge active={u.active} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.length)} of {users.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                          p === page
                            ? "bg-[var(--accent)] text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
