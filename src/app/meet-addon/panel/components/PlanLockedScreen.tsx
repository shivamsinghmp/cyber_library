"use client";

type Props = {
  state: string;
  daysLeft?: number;
  onBack?: () => void;
};

const MESSAGES: Record<string, {
  icon: string; title: string; body: string;
  cta: string; ctaHref: string;
  color: string; border: string; textClr: string;
}> = {
  expired: {
    icon: "⚠️",
    title: "Plan Expired",
    body: "Your subscription has expired. Please renew your plan to continue using Meet Add-on.",
    cta: "Renew Plan →",
    ctaHref: "/pricing",
    color: "#FEF2F2", border: "#FECACA", textClr: "#991B1B",
  },
  trial_expired: {
    icon: "🔒",
    title: "Free Trial Ended",
    body: "Your free trial has ended. Get a paid plan to continue using Meet Add-on.",
    cta: "Get a Plan →",
    ctaHref: "/pricing",
    color: "#FFFBEB", border: "#FDE68A", textClr: "#92400E",
  },
  no_plan: {
    icon: "🔒",
    title: "Plan Required",
    body: "Meet Add-on is only available to subscribers. Start a trial or get a plan.",
    cta: "Trial / Get Plan →",
    ctaHref: "/pricing",
    color: "#EEF2FF", border: "#C7D2FE", textClr: "#3730A3",
  },
};

export function PlanLockedScreen({ state, onBack }: Props) {
  const cfg = MESSAGES[state] ?? MESSAGES.no_plan;

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, #6366F122 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-32 right-0 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 100%)" }} />
        <div className="absolute bottom-0 -left-16 h-[300px] w-[300px] rounded-full blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4">
        {/* Brand */}
        <div className="text-center mb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[0_8px_32px_rgba(99,102,241,0.25)]"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
          >
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-xs font-black tracking-[0.2em] uppercase text-[#94A3B8]">Let&apos;s Study</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-7 text-center shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
          style={{ background: cfg.color, borderColor: cfg.border }}
        >
          <div className="text-4xl mb-4">{cfg.icon}</div>
          <h2 className="text-lg font-extrabold mb-3" style={{ color: cfg.textClr }}>{cfg.title}</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: cfg.textClr, opacity: 0.85 }}>{cfg.body}</p>

          <a
            href={cfg.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white mb-3 transition-all hover:opacity-90 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
          >
            {cfg.cta}
          </a>

          {onBack && (
            <button
              onClick={onBack}
              className="block w-full py-2 text-xs font-bold uppercase tracking-widest transition-colors hover:opacity-80"
              style={{ color: cfg.textClr, opacity: 0.55 }}
            >
              ← Logout
            </button>
          )}
        </div>

        <p className="text-center text-[11px] font-semibold" style={{ color: "#94A3B8" }}>
          Need help?{" "}
          <a href="mailto:support@lstudy.in" className="underline" style={{ color: "#6366F1" }}>
            support@lstudy.in
          </a>
        </p>
      </div>
    </div>
  );
}
