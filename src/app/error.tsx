"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary for Next.js App Router.
 * Shown when an unhandled error occurs in any page/layout.
 * Matches Cyber Library dark theme.
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console (replace with Sentry when configured)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0805] px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-950/50 border border-red-900/50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-[#f8f4ed] text-2xl font-bold font-heading mb-2">
          Kuch galat ho gaya
        </h1>
        <p className="text-[#9a8264] text-sm mb-2">
          Ek unexpected error aa gaya. Hamari team ko pata chal gaya hai.
        </p>
        {error.digest && (
          <p className="text-[#9a8264]/50 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-[#9a8264] hover:bg-[#b09575] text-[#1f1810] font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Dobara try karo
        </button>
      </div>
    </div>
  );
}
