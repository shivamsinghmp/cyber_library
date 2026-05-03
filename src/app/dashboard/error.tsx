"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-950/40 border border-red-900/40 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-[#f8f4ed] text-xl font-bold font-heading mb-2">
          Dashboard load nahi hua
        </h2>
        <p className="text-[#9a8264] text-sm mb-6">
          Thodi der mein dobara try karo. Agar problem bana rahe toh support se contact karo.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#9a8264] hover:bg-[#b09575] text-[#1f1810] font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-[#1f1810] border border-[#2a2018] hover:border-[#9a8264] text-[#e0d5c8] px-4 py-2 rounded-xl transition-colors text-sm"
          >
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
