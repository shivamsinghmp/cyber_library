import { Bell, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-[var(--cream)] md:text-2xl">
        Settings
      </h1>
      <p className="text-sm text-[var(--cream-muted)]">
        Manage your account and preferences.
      </p>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Bell className="h-5 w-5 text-[var(--accent)]" />
          Notifications
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Email and session reminders
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="text-sm text-[var(--cream)]">Session reminders</span>
            <input type="checkbox" className="h-4 w-4 rounded border-white/20" defaultChecked />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span className="text-sm text-[var(--cream)]">Streak reminders</span>
            <input type="checkbox" className="h-4 w-4 rounded border-white/20" defaultChecked />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Shield className="h-5 w-5 text-[var(--accent)]" />
          Account
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Password and security
        </p>
        <div className="mt-4">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
          >
            Change password (coming soon)
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Palette className="h-5 w-5 text-[var(--accent)]" />
          Appearance
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Theme (Coffee & Cream is the default)
        </p>
        <p className="mt-4 text-sm text-[var(--cream-muted)]">
          Using the default theme.
        </p>
      </section>
    </div>
  );
}
