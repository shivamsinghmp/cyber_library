import Link from "next/link";
import { Suspense } from "react";
import { getAppSetting } from "@/lib/app-settings";
import { Facebook, Instagram, Twitter, Github, Youtube } from "lucide-react";
import { FooterNewsletterForm } from "./FooterNewsletterForm";

type LinkItem = { label: string; url: string };
type FooterColumn = { title: string; links: LinkItem[] };
type SocialLink = { platform: string; url: string };

type FooterConfig = {
  columns: FooterColumn[];
  newsletter: { title: string; description: string; buttonText: string };
  socials: SocialLink[];
  copyright: string;
};

const DEFAULT_FOOTER: FooterConfig = {
  columns: [
    {
      title: "Platform",
      links: [
        { label: "Study Room", url: "/study-room" },
        { label: "Mentorship", url: "/mentorship" },
        { label: "Mental Session", url: "/mental-session" },
        { label: "Store", url: "/store" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", url: "/about" },
        { label: "Blog", url: "/blog" },
        { label: "Rules", url: "/rules" },
        { label: "Support", url: "/support" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms", url: "/terms" },
        { label: "Privacy", url: "/privacy" },
        { label: "Refund", url: "/refund" },
        { label: "WhatsApp Data Deletion", url: "/whatsapp-data-deletion" },
      ],
    },
  ],
  newsletter: {
    title: "Stay in the loop",
    description: "Focus tips & hub updates, weekly.",
    buttonText: "Subscribe",
  },
  socials: [
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "youtube",   url: "https://youtube.com" },
    { platform: "twitter",   url: "https://twitter.com" },
    { platform: "github",    url: "https://github.com" },
  ],
  copyright: `© ${new Date().getFullYear()} Let's Study. All rights reserved.`,
};

function resolveIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "facebook":  return <Facebook className="w-3.5 h-3.5" />;
    case "instagram": return <Instagram className="w-3.5 h-3.5" />;
    case "twitter":
    case "x":        return <Twitter className="w-3.5 h-3.5" />;
    case "github":   return <Github className="w-3.5 h-3.5" />;
    case "youtube":  return <Youtube className="w-3.5 h-3.5" />;
    default:         return <div className="w-3.5 h-3.5 rounded-full" />;
  }
}

function FooterInner({ config }: { config: FooterConfig }) {
  return (
    <footer data-footer className="relative overflow-hidden border-t" style={{ borderColor: "#CBD5E1", background: "#E2E8F0" }}>

      {/* Rainbow top border */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4, #10B981)" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-8">

        {/* ── MAIN ROW: Brand | Links | Newsletter ── */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-8 md:gap-12 items-start">

          {/* Brand */}
          <div className="space-y-3 min-w-[160px]">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.svg"
                alt="Let's Study"
                width={36}
                height={36}
                className="h-9 w-9 object-contain flex-shrink-0"
                style={{ filter: "drop-shadow(0 3px 8px rgba(99,102,241,0.35))" }}
              />
              <div>
                <p className="text-base font-extrabold leading-tight" style={{ color: "var(--foreground)" }}>Let's Study</p>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.15em]" style={{ color: "var(--accent)" }}>The Focus Hub</p>
              </div>
            </div>

            <p className="text-[13px] font-bold leading-relaxed max-w-[180px]" style={{ color: "var(--muted-text)" }}>
              Elite online focus sessions for serious students.
            </p>

            <div className="flex items-center gap-1.5">
              {config.socials.filter(s => s.url).map((item) => (
                <a
                  key={item.platform}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.platform}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                  style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "white" }}
                >
                  {resolveIcon(item.platform)}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-6">
            {config.columns.map((col) => (
              <div key={col.title}>
                <h4 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: "var(--foreground)" }}>
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.url}
                        className="text-[13px] font-bold transition-colors hover:text-[var(--accent)]"
                        style={{ color: "var(--muted-text)" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="min-w-[220px]">
            <p className="mb-0.5 text-[13px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--foreground)" }}>
              {config.newsletter.title}
            </p>
            <p className="mb-3 text-[13px] font-bold" style={{ color: "var(--muted-text)" }}>
              {config.newsletter.description}
            </p>
            <FooterNewsletterForm buttonText={config.newsletter.buttonText} />
          </div>

        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="mt-6 border-t pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "#CBD5E1" }}>
          <p className="text-[13px] font-bold" style={{ color: "var(--muted-text)" }}>
            {config.copyright}
          </p>
          <div className="flex items-center gap-1 text-[13px] font-bold" style={{ color: "var(--muted-text)" }}>
            <span>Made with ❤️ for serious students</span>
          </div>
          <div className="flex items-center gap-3 text-[13px] font-bold" style={{ color: "var(--muted-text)" }}>
            <Link href="/terms"   className="hover:text-[var(--accent)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-[var(--accent)] transition-colors">Support</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

async function FooterLoader() {
  const jsonStr = await getAppSetting("FOOTER_CONFIG_JSON");
  let config = DEFAULT_FOOTER;
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      config = { ...DEFAULT_FOOTER, ...parsed };
    } catch { /* keep default */ }
  }
  return <FooterInner config={config} />;
}

export async function Footer() {
  return (
    <Suspense fallback={<FooterInner config={DEFAULT_FOOTER} />}>
      <FooterLoader />
    </Suspense>
  );
}
