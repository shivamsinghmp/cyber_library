"use client";

import { Plus } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  addLabel?: string;
  onAdd?: () => void;
  extra?: React.ReactNode;
};

export function AdminPageHeader({ title, description, addLabel = "Create", onAdd, extra }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--cream-muted)]">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
