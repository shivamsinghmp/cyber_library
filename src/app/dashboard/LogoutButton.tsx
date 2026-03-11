"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await fetch("/api/auth/record-logout", { method: "POST" });
        } catch {
          // ignore
        }
        signOut({ callbackUrl: "/login" });
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/5 hover:text-[var(--cream)]"
    >
      <LogOut className="h-4 w-4" />
      Log out
    </button>
  );
}
