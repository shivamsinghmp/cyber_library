"use client";

type Props = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: Props) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-[var(--cream-muted)]"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
