import Link from "next/link";
import { Calendar, Video, BookOpenCheck } from "lucide-react";
import { requireStaffModule } from "@/lib/permissions";

export default async function StaffLibraryPage() {
  await requireStaffModule("VIRTUAL_LIBRARY");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--cream)]">
        <BookOpenCheck className="h-6 w-6 text-[var(--accent)]" /> Virtual Library
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/staff/library/slots"
          className="block rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl transition hover:border-[var(--accent)]/30 hover:bg-black/40"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
            <Calendar className="h-5 w-5 text-[var(--accent)]" /> Study Room Slots
          </h2>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">
            Manage room slots, live Meet attendance, and Calendar auto-admit sync.
          </p>
        </Link>

        <Link
          href="/staff/library/polls"
          className="block rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl transition hover:border-[var(--accent)]/30 hover:bg-black/40"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
            <Video className="h-5 w-5 text-[var(--accent)]" /> Meet Polls
          </h2>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">
            Create and manage polls/quizzes shown inside the Google Meet add-on.
          </p>
        </Link>
      </div>
    </div>
  );
}
