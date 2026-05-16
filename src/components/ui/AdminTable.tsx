"use client";

type Props = {
  loading: boolean;
  empty: boolean;
  emptyText?: string;
  children: React.ReactNode;
  minWidth?: string;
};

export function AdminTable({
  loading,
  empty,
  emptyText = "No items yet.",
  children,
  minWidth = "600px",
}: Props) {
  if (loading) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
        Loading…
      </p>
    );
  }
  if (empty) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50">
      <table className="w-full" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export function AdminTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">
      {children}
    </th>
  );
}

export function AdminTd({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <td className={`py-2.5 pr-3 text-sm ${className ?? "text-[var(--cream-muted)]"}`} title={title}>
      {children}
    </td>
  );
}
