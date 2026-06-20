import { Bell, Shield, Palette, Settings2, ChevronRight, Lock, Smartphone, Moon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Settings</h1>
          <p className="text-xs text-[var(--muted-text)]">Manage your account preferences</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-pale)] flex items-center justify-center">
            <Bell className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Notifications</h2>
            <p className="text-xs text-[var(--muted-text)]">Email and session reminders</p>
          </div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {[
            { label: "Session reminders", desc: "Get notified before your study slot starts", defaultChecked: true },
            { label: "Streak reminders", desc: "Daily reminder to keep your streak alive", defaultChecked: true },
            { label: "Leaderboard updates", desc: "Weekly rank change notifications", defaultChecked: false },
          ].map(({ label, desc, defaultChecked }) => (
            <label key={label} className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[var(--page-bg)] transition-colors group">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{label}</p>
                <p className="text-xs text-[var(--muted-text)] mt-0.5">{desc}</p>
              </div>
              <div className="relative shrink-0">
                <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
                <div className="w-10 h-6 bg-[var(--border)] peer-checked:bg-[var(--accent)] rounded-full transition-colors cursor-pointer" />
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Account / Security */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Account & Security</h2>
            <p className="text-xs text-[var(--muted-text)]">Password and security settings</p>
          </div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {[
            { icon: Lock, label: "Change Password", desc: "Update your account password", badge: "Coming soon" },
            { icon: Smartphone, label: "Two-Factor Auth", desc: "Add an extra layer of security", badge: "Coming soon" },
          ].map(({ icon: Icon, label, desc, badge }) => (
            <div key={label} className="flex items-center justify-between px-6 py-4 hover:bg-[var(--page-bg)] transition-colors cursor-default">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-[var(--muted-text)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
                  <p className="text-xs text-[var(--muted-text)] mt-0.5">{desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--page-bg)] border border-[var(--border)] text-[var(--muted-text)] uppercase tracking-wide">{badge}</span>}
                <ChevronRight className="w-4 h-4 text-[var(--muted-text)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
            <Palette className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Appearance</h2>
            <p className="text-xs text-[var(--muted-text)]">Theme and display preferences</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-[var(--muted-text)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Dark Mode</p>
                <p className="text-xs text-[var(--muted-text)]">Switch to dark theme</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--page-bg)] border border-[var(--border)] text-[var(--muted-text)] uppercase tracking-wide">Coming soon</span>
          </div>
          <div className="rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] px-4 py-3">
            <p className="text-xs font-semibold text-[var(--accent)]">Aurora Theme Active</p>
            <p className="text-xs text-[var(--muted-text)] mt-0.5">Clean light theme optimized for long study sessions.</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-rose-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
            <Shield className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-700">Danger Zone</h2>
            <p className="text-xs text-rose-400">Irreversible account actions</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Delete Account</p>
              <p className="text-xs text-[var(--muted-text)] mt-0.5">Permanently remove your account and all data</p>
            </div>
            <button type="button" className="px-4 py-2 rounded-xl border border-rose-200 text-rose-500 text-xs font-bold hover:bg-rose-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
