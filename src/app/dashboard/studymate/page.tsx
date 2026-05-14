import StudyMateChat from "@/components/StudyMateChat";
import {
  Sparkles, BookOpen, Zap, Brain, Camera,
  Target, Clock, TrendingUp, Coins, ArrowRight,
  MessageSquare,
} from "lucide-react";

const FEATURES = [
  { icon: BookOpen,    title: "Study Plan",     desc: "Exam date + syllabus → perfect timetable",          color: "text-[var(--accent)] bg-[var(--accent-pale)] border-[var(--accent-border)]" },
  { icon: Zap,         title: "Shortcuts",       desc: "Har question ke 3 methods — slow, fast, fastest",   color: "text-amber-600 bg-amber-50 border-amber-200" },
  { icon: Camera,      title: "Photo Solve",     desc: "Handwritten ya printed — photo upload karo",        color: "text-violet-600 bg-violet-50 border-violet-200" },
  { icon: Target,      title: "80/20 Focus",     desc: "Top 20% topics jo 80% marks denge",                color: "text-rose-600 bg-rose-50 border-rose-200" },
  { icon: Brain,       title: "Doubt Clear",     desc: "Step-by-step explanation with reasoning",           color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { icon: TrendingUp,  title: "Weak Topic Fix",  desc: "AI diagnose karega kahan aur kyun galti hoti hai",  color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { icon: Clock,       title: "Speed Training",  desc: "Same question — standard vs shortcut method",       color: "text-orange-600 bg-orange-50 border-orange-200" },
  { icon: Sparkles,    title: "Stress Support",  desc: "Frustrated ho? Bas batao — friend mode ON",         color: "text-pink-600 bg-pink-50 border-pink-200" },
];

const TIPS = [
  "Pehle batao — kaunsa exam (UPSC/JEE/NEET/GATE/CAT/SSC), kaunsi class, aur exam date kab hai",
  "Question ki photo lo aur upload karo — AI step-by-step solve karega + shortcut bhi batayega",
  "Stressed ya frustrated feel ho toh seedha batao — AI friend mode mein aa jaayega",
  "Ek topic mein baar baar galti ho toh batao — AI root cause dhundega aur fix karega",
];

const COIN_INFO = [
  { label: "Roz free messages",   value: "5 messages",         color: "text-emerald-600" },
  { label: "Extra messages",       value: "5 coins = 10 msgs",  color: "text-amber-600"  },
  { label: "Coins kaise kamao?",   value: "Study room join karo", color: "text-[var(--accent)]" },
];

export default function StudyMateAIPage() {
  // Auth is handled by DashboardShell — no duplicate auth() call here
  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center justify-between">
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
              UPSC · JEE · NEET · GATE · CAT · SSC — doubt clear karo, plan banao, aur topper bano
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

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Chat — 2 cols ── */}
        <div className="lg:col-span-2 h-[600px] md:h-[660px]">
          <StudyMateChat />
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-4">

          {/* Features */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
              <p className="text-sm font-bold text-[var(--foreground)]">Kya kar sakta hoon?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FEATURES.map((f) => (
                <div key={f.title}
                  className="rounded-xl border p-3 hover:shadow-[var(--shadow-sm)] transition-all cursor-default"
                  style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}>
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center mb-2 ${f.color}`}>
                    <f.icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-bold text-[var(--foreground)] leading-tight">{f.title}</p>
                  <p className="text-[10px] text-[var(--muted-text)] mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coin system */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-[var(--foreground)]">Coin System</p>
            </div>
            <div className="space-y-3">
              {COIN_INFO.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-text)]">{item.label}</span>
                  <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <a href="/dashboard"
              className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-pale)] border border-[var(--accent-border)] rounded-xl py-2.5 hover:bg-[var(--accent)] hover:text-white transition-all">
              Study room → coins kamao <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Pro Tips */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-bold text-[var(--foreground)]">Pro Tips</p>
            </div>
            <ul className="space-y-3">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-lg bg-[var(--accent-pale)] border border-[var(--accent-border)] text-[var(--accent)] text-[10px] font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-[var(--body-text)] leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
