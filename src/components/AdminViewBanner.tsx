"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  adminName:       string;
  studentName:     string;
  studentUniqueId: string;
}

export function AdminViewBanner({ adminName, studentName, studentUniqueId }: Props) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function handleExit() {
    setExiting(true);
    await fetch("/api/admin/student-view/exit", { method: "POST" });
    router.push("/admin/student-view");
  }

  return (
    <div
      className="sticky top-0 z-[9999] flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
      style={{ background: "#FCEBEB", borderBottom: "1.5px solid #F0AAAA", color: "#791F1F" }}
    >
      <span className="flex items-center gap-2 flex-1 min-w-0 font-semibold">
        <span className="text-base shrink-0">👁️</span>
        <span className="truncate">
          <strong>Admin View Mode</strong> —{" "}
          <strong>{adminName}</strong> dekh raha hai{" "}
          <strong>{studentName}</strong>{" "}
          <span className="opacity-70 font-normal">(#{studentUniqueId})</span> ka dashboard
        </span>
      </span>

      <span className="text-xs opacity-60 shrink-0 hidden sm:block">Read-only</span>

      <button
        onClick={handleExit}
        disabled={exiting}
        className="shrink-0 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-opacity disabled:opacity-50"
        style={{ background: "#791F1F", color: "white" }}
      >
        {exiting ? "Exiting…" : "✕ Exit View"}
      </button>
    </div>
  );
}
