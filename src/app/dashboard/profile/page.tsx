import { ToggleProfileForm } from "@/components/ToggleProfileForm";
import { UserCircle2 } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
          <UserCircle2 className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">My Profile</h1>
          <p className="text-xs text-[var(--muted-text)]">Manage your personal information and study goals</p>
        </div>
      </div>
      <ToggleProfileForm />
    </div>
  );
}
