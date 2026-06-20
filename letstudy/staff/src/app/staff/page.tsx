import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StaffStudentLookup } from "@/components/StaffStudentLookup";
import { Calendar, MessageSquare, Ticket } from "lucide-react";
import Link from "next/link";

export default async function StaffDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const displayName = session.user.name ?? session.user.email ?? "Staff";
  const [activeSessions, tickets] = await Promise.all([
    prisma.studySession.findMany({
      where: { endedAt: null },
      take: 10,
      orderBy: { startedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    [],
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Welcome, {displayName}!
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Staff Dashboard — student lookup, active sessions, and support
        </p>
      </div>

      <StaffStudentLookup />

      <Link
        href="/staff/whatsapp"
        className="block rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl transition hover:border-[var(--accent)]/30 hover:bg-black/40"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
          WhatsApp Chats
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          View and reply to student WhatsApp conversations
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--accent)]">Open WhatsApp dashboard →</p>
      </Link>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Calendar className="h-5 w-5 text-[var(--accent)]" />
          Active Study Sessions
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Sessions currently in progress
        </p>
        <ul className="mt-4 space-y-2">
          {activeSessions.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[var(--cream-muted)]">
              No active sessions
            </li>
          ) : (
            activeSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--cream)]">
                    {s.user.name || s.user.email}
                  </p>
                  <p className="text-xs text-[var(--cream-muted)]">
                    Started {new Date(s.startedAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Live
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Ticket className="h-5 w-5 text-[var(--accent)]" />
          Support Tickets
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Student queries and issues
        </p>
        <ul className="mt-4 space-y-2">
          {tickets.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[var(--cream-muted)]">
              No open tickets
            </li>
          ) : (
            tickets.map((t: { id: string; subject?: string }) => (
              <li
                key={t.id}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                {(t as { subject?: string }).subject || "Support request"}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
