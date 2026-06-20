"use client";

type Props = {
  onCancel: () => void;
  saving: boolean;
  isEdit?: boolean;
  createLabel?: string;
  updateLabel?: string;
};

export function FormActions({
  onCancel,
  saving,
  isEdit = false,
  createLabel = "Create",
  updateLabel = "Save",
}: Props) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70 hover:bg-[var(--accent-hover)] transition"
      >
        {saving ? (isEdit ? "Saving…" : "Creating…") : isEdit ? updateLabel : createLabel}
      </button>
    </div>
  );
}
