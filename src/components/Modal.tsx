"use client";

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0b07] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--cream)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--cream)]/80 hover:bg-white/10"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
