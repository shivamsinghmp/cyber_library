"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0FDFA] px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-[#0F2830] text-2xl font-bold font-heading mb-2">
          Kuch galat ho gaya
        </h1>
        <p className="text-[#0D9488] text-sm mb-2">
          Ek unexpected error aa gaya. Hamari team ko pata chal gaya hai.
        </p>
        {error.digest && (
          <p className="text-[#0D9488]/50 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm shadow-[0_4px_18px_rgba(13,148,136,0.35)]"
        >
          <RefreshCw className="w-4 h-4" />
          Dobara try karo
        </button>
      </div>
    </div>
  );
}
