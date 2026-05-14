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
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-[#0F2830] text-xl font-bold font-heading mb-2">
          Dashboard load nahi hua
        </h2>
        <p className="text-[#0D9488] text-sm mb-6">
          Thodi der mein dobara try karo. Agar problem bana rahe toh support se contact karo.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold px-4 py-2 rounded-full transition-colors text-sm shadow-[0_4px_18px_rgba(13,148,136,0.35)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white border border-[#CCFBF1] hover:border-[#0D9488] text-[#0F2830] px-4 py-2 rounded-full transition-colors text-sm shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
