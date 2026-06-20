"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export function EmailVerifyBanner({ email }: { email: string }) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3"
      style={{ background: "#DC2626", color: "#fff" }}>

      <ShieldAlert className="h-5 w-5 shrink-0" />

      <div className="flex-1 min-w-0 text-sm font-semibold">
        <span className="mr-1">Email not verified!</span>
        <span className="font-normal opacity-90 hidden sm:inline">
          Go to Profile and verify{" "}
          <strong className="ml-0.5">{email}</strong>{" "}
          with an OTP.
        </span>
      </div>

      <Link
        href="/dashboard/profile"
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-red-600 hover:bg-red-50 transition-colors">
        Go to Profile →
      </Link>
    </div>
  );
}
