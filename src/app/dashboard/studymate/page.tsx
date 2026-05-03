import { auth } from "@/auth";
import { redirect } from "next/navigation";
import StudyMateChat from "@/components/StudyMateChat";
import { Sparkles, BookOpen, Zap, Brain, Camera, Target, Clock, TrendingUp } from "lucide-react";

// ─── Feature cards ────────────────────────────────────────────────────────────
const features = [
  { icon: BookOpen,   title: "Study Plan",      desc: "Exam date + syllabus → perfect timetable" },
  { icon: Zap,        title: "Shortcuts",        desc: "Har question ke 3 methods — slow, fast, fastest" },
  { icon: Camera,     title: "Photo Solve",      desc: "Handwritten ya printed — photo upload karo" },
  { icon: Target,     title: "80/20 Focus",      desc: "Top 20% topics jo 80% marks denge" },
  { icon: Brain,      title: "Doubt Clear",      desc: "Step-by-step explanation with reasoning" },
  { icon: TrendingUp, title: "Weak Topic Fix",   desc: "AI diagnose karega kahan aur kyun galti hoti hai" },
  { icon: Clock,      title: "Speed Training",   desc: "Same question — standard vs shortcut method" },
  { icon: Sparkles,   title: "Stress Support",   desc: "Frustrated ho? Bas batao — friend mode ON" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function StudyMateAIPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0b0805]">
      {/* Page header */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c8b39c] to-[#9a8264] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#1f1810]" />
          </div>
          <h1 className="text-[#f8f4ed] text-xl font-bold font-heading">StudyMate AI</h1>
          <span className="text-[10px] bg-[#1f1810] border border-[#2a2018] text-[#9a8264] px-2 py-0.5 rounded-full">BETA</span>
        </div>
        <p className="text-[#9a8264] text-sm">
          24/7 AI study buddy — JEE doubt solving, personalized plans, aur stress management
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chat — 2 cols */}
        <div className="lg:col-span-2 h-[580px] md:h-[640px]">
          <StudyMateChat />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Features grid */}
          <div className="bg-[#130f09] rounded-2xl border border-[#2a2018] p-4">
            <p className="text-[#e0d5c8] font-semibold text-sm mb-3 font-heading">Kya kar sakta hoon?</p>
            <div className="grid grid-cols-2 gap-2">
              {features.map((f) => (
                <div key={f.title} className="bg-[#1f1810] rounded-xl p-2.5 border border-[#2a2018] hover:border-[#9a8264]/40 transition-colors">
                  <f.icon className="w-3.5 h-3.5 text-[#9a8264] mb-1.5" />
                  <p className="text-[#f8f4ed] text-xs font-semibold leading-tight">{f.title}</p>
                  <p className="text-[#9a8264] text-[10px] mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coin system */}
          <div className="bg-[#130f09] rounded-2xl border border-[#2a2018] p-4">
            <p className="text-[#e0d5c8] font-semibold text-sm mb-3 font-heading">🪙 Coin System</p>
            <div className="space-y-2">
              {[
                { label: "Roz free messages",    value: "5 messages",       color: "text-emerald-400" },
                { label: "Extra messages",        value: "5 coins = 10 msgs", color: "text-amber-400"  },
                { label: "Coins kaise kamao?",    value: "Study room join karo", color: "text-[#c8b39c]" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-[#9a8264] text-xs">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <a href="/dashboard" className="mt-3 block text-center text-xs text-[#9a8264] hover:text-[#c8b39c] transition-colors border border-[#2a2018] hover:border-[#9a8264]/40 rounded-lg py-2">
              Study room → coins kamao 🏃
            </a>
          </div>

          {/* Tips */}
          <div className="bg-[#130f09] rounded-2xl border border-[#2a2018] p-4">
            <p className="text-[#e0d5c8] font-semibold text-sm mb-3 font-heading">💡 Pro Tips</p>
            <ul className="space-y-2">
              {[
                "Apni class, target exam, aur exam date pehle batao — personalized plan milega",
                "Question ki photo lo aur upload karo — AI step-by-step solve karega + shortcut bhi batayega",
                "Stressed ya frustrated feel ho toh seedha batao — AI friend mode mein aa jaayega",
                "Ek topic mein baar baar galti ho toh batao — AI root cause dhundega",
              ].map((tip) => (
                <li key={tip} className="flex gap-2 text-xs text-[#9a8264] leading-relaxed">
                  <span className="text-[#c8b39c] flex-shrink-0 mt-0.5">→</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
