"use client";

import { Pencil, Trash2 } from "lucide-react";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
};

export function RowActions({ onEdit, onDelete, extra }: Props) {
  return (
    <div className="flex items-center gap-2">
      {extra}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-[var(--cream-muted)] transition hover:bg-gray-100 hover:text-gray-900"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-red-400/80 transition hover:bg-red-100 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
