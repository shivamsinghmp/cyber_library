import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Clock, Shield, Activity, Search } from "lucide-react";
import { requireAdminModule } from "@/lib/permissions";

function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only users with STAFF_MGMT access should view security audit logs
  await requireAdminModule("STAFF_MGMT");

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100, // Show last 100 recent activities
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl flex items-center gap-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            Security & Audit Logs
          </h1>
          <p className="mt-2 text-sm text-[var(--cream-muted)] max-w-2xl">
            Real-time track of all sensitive dashboard activities. Shows what modules were accessed, who performed the structural changes, and when it happened. Limits to 100 latest actions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--wood)]/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-400">
          <Activity className="h-4 w-4 animate-pulse" />
           Live Tracking Active
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[var(--ink)]/40 shadow-xl backdrop-blur-md">
        {logs.length === 0 ? (
          <div className="p-16 text-center text-[var(--cream-muted)]">
            <Search className="h-8 w-8 mx-auto opacity-30 mb-4" />
            <p>No administrative activities formally logged yet.</p>
          </div>
        ) : (
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[#1a1511]">
              <tr className="border-b border-white/10 text-left text-[var(--wood)]">
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Timestamp</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Staff Member</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Action</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Module</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">Details</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-widest text-[10px]">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--cream-muted)] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 opacity-50" />
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--cream)] flex items-center gap-2">
                      {log.user.name || "Unknown"}
                      {log.user.role === "ADMIN" && (
                         <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--accent)] border border-[var(--accent)]/20">Admin</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--cream-muted)]">{log.user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        log.action === "DELETE" || log.action === "REVOKE"
                          ? "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                          : log.action === "CREATE" || log.action === "GRANT"
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                          : log.action === "UPDATE"
                          ? "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20"
                          : "bg-white/10 text-[var(--cream-muted)] ring-1 ring-inset ring-white/20"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-[var(--wood)]">
                    {log.module}
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="line-clamp-2 text-[var(--cream)] font-medium leading-relaxed">
                      {log.details}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[var(--cream-muted)]/70">
                    {log.ipAddress || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
