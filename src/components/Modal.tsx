"use client";

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ isOpen, title, onClose, children, className }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 backdrop-blur-sm px-4">
      <div className={`w-full ${className || "max-w-md"} rounded-2xl border border-[var(--cream-muted)] bg-white p-6 shadow-[0_24px_60px_rgba(13,148,136,0.15)]`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--cream-muted)] bg-[var(--cream)] text-[var(--foreground)]/60 hover:bg-[var(--cream-muted)] hover:text-[var(--accent)] transition-colors"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
