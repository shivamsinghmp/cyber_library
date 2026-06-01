export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-8 w-56 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="h-10 w-24 rounded-xl bg-gray-100 animate-pulse" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
