"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ClipboardList } from "lucide-react";

type LeadRow = {
  id: string;
  data: Record<string, unknown>;
  source?: string | null;
  createdAt: string;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/leads", { credentials: "include" });
        if (!res.ok) {
          setLeads([]);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as LeadRow[];
        setLeads(Array.isArray(data) ? data : []);
      } catch {
        setLeads([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[var(--cream)]">
          <ClipboardList className="h-7 w-7 text-[var(--accent)]" />
          Leads (Join form submissions)
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          All submissions from the public join page. Fields are configured via Profile Fields →
          Landing form (new student).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--cream-muted)]">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center text-sm text-[var(--cream-muted)]">
          No leads yet. Share the <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
            /join
          </code>{" "}
          link in your ads to collect new students.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/30">
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Created at</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Name</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Email</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Details</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const created = new Date(lead.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const data = lead.data || {};
                const name =
                  (data["full_name"] as string) ||
                  (data["name"] as string) ||
                  (data["student_name"] as string) ||
                  "";
                const email =
                  (data["email"] as string) ||
                  (data["student_email"] as string) ||
                  (data["contact_email"] as string) ||
                  "";
                const mobile =
                  (data["mobile"] as string) ||
                  (data["phone"] as string) ||
                  (data["whatsapp"] as string) ||
                  "";
                const exam =
                  (data["prepation"] as string) ||
                  (data["preparation"] as string) ||
                  (data["exam"] as string) ||
                  (data["goal"] as string) ||
                  "";
                const isExpanded = expandedId === lead.id;
                const prettyJson = JSON.stringify(data, null, 2);
                return (
                  <tr key={lead.id} className="border-b border-white/5 align-top">
                    <td className="px-4 py-3 text-xs text-[var(--cream-muted)] whitespace-nowrap">
                      {created}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--cream)] whitespace-nowrap">
                      {name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--cream-muted)] whitespace-nowrap">
                      {email || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[var(--cream-muted)] align-top">
                      <div className="space-y-2 rounded-xl bg-black/40 p-2">
                        <div className="space-y-1">
                          <p>
                            <span className="font-semibold text-[var(--cream)]">Mobile:</span>{" "}
                            {mobile || "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--cream)]">Exam / Goal:</span>{" "}
                            {exam || "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                          className="mt-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]"
                        >
                          {isExpanded ? "Hide full details" : "View full details"}
                        </button>
                        {isExpanded && (
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/60 p-2 text-[10px] text-[var(--cream-muted)]">
                            {prettyJson}
                          </pre>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--cream-muted)] max-w-[160px] break-words">
                      {lead.source || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

