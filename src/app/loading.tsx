export default function RootLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--accent-pale)]" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[var(--accent)] animate-spin" />
        </div>
        <p className="text-sm text-[var(--muted-text)] font-medium animate-pulse">Loading…</p>
      </div>
    </div>
  );
}
