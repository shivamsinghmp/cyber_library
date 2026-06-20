import StudyMateChat from "@/components/StudyMateChat";
import { Sparkles } from "lucide-react";

export default function StudyMateAIPage() {
  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--foreground)]">StudyMate AI</h1>
              <span className="text-[10px] font-bold bg-[var(--accent-pale)] text-[var(--accent)] border border-[var(--accent-border)] px-2 py-0.5 rounded-full uppercase tracking-wide">
                Beta
              </span>
            </div>
            <p className="text-xs text-[var(--muted-text)]">
              UPSC · JEE · NEET · GATE · CAT · SSC — clear doubts, plan your study, and top the exam
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600">Online</span>
          </div>
        </div>
      </div>

      {/* ── Full-width Chat — flex-1 min-h-0 so it fills remaining height without overflow ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <StudyMateChat />
      </div>

    </div>
  );
}
