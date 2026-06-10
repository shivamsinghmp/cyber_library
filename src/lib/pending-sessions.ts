// Client-only — never import on the server side
const QUEUE_KEY = "vl_pending_sessions";
const MAX_AGE_MS = 86_400_000; // discard entries older than 24 h
const MAX_ENTRIES = 20;

type PendingSession = {
  token: string;
  roomKey: string;
  plannedSeconds: number;
  completedSeconds: number;
  completedFully: boolean;
  queuedAt: number;
};

function readQueue(): PendingSession[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); } catch { return []; }
}

/** Append a failed session to the offline queue so it can be retried on next page load. */
export function queuePendingSession(s: Omit<PendingSession, "queuedAt">) {
  const list = readQueue();
  if (list.length >= MAX_ENTRIES) list.shift();
  list.push({ ...s, queuedAt: Date.now() });
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(list)); } catch {}
}

/**
 * Drain the offline queue — call once on page mount.
 * Sends each queued session to the API; keeps failures for the next attempt.
 * Server-side dedup in the API handles any duplicates from keepalive + queue.
 */
export async function drainPendingSessions(): Promise<void> {
  const list = readQueue();
  if (list.length === 0) return;
  localStorage.removeItem(QUEUE_KEY);
  const failed: PendingSession[] = [];
  for (const s of list) {
    if (Date.now() - s.queuedAt > MAX_AGE_MS) continue;
    try {
      const res = await fetch("/api/meet-addon/pomodoro-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
        body: JSON.stringify({
          roomKey: s.roomKey,
          plannedSeconds: s.plannedSeconds,
          completedSeconds: s.completedSeconds,
          completedFully: s.completedFully,
        }),
      });
      if (!res.ok) failed.push(s);
    } catch {
      failed.push(s);
    }
  }
  if (failed.length > 0) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(failed)); } catch {}
  }
}
