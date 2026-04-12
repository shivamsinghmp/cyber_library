import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedAdminPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-bold text-[var(--cream)] mb-2">Access Denied</h1>
      <p className="text-[var(--cream-muted)] max-w-md mb-8">
        You do not have the required permissions to view this module. If you believe you need access, please contact the Super Admin.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/admin" 
          className="rounded-xl border border-white/10 bg-black/40 px-6 py-3 text-sm font-medium text-[var(--cream)] hover:bg-black/60 transition"
        >
          Go Back Dashboard
        </Link>
        <Link 
          href="/staff" 
          className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
        >
          Staff Portal
        </Link>
      </div>
    </div>
  );
}
