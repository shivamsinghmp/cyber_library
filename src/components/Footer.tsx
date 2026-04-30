import Link from "next/link";
import { Suspense } from "react";
import { getAppSetting } from "@/lib/app-settings";
import { auth } from "@/auth";
import { Facebook, Instagram, Twitter, Github, Youtube, Send } from "lucide-react";
import { FooterNewsletterForm } from "./FooterNewsletterForm";

type LinkItem = { label: string; url: string };
type FooterColumn = { title: string; links: LinkItem[] };
type SocialLink = { platform: string; url: string };

type FooterConfig = {
  columns: FooterColumn[];
  newsletter: {
    title: string;
    description: string;
    buttonText: string;
  };
  socials: SocialLink[];
  copyright: string;
};

const DEFAULT_FOOTER: FooterConfig = {
  columns: [
    {
      title: "Solutions",
      links: [
        { label: "Marketing", url: "/marketing" },
        { label: "Analytics", url: "/analytics" },
        { label: "Automation", url: "/automation" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Submit ticket", url: "/support" },
        { label: "Documentation", url: "/docs" },
        { label: "Guides", url: "/guides" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", url: "/about" },
        { label: "Blog", url: "/blog" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of service", url: "/terms" },
        { label: "Privacy policy", url: "/privacy" },
      ],
    },
  ],
  newsletter: {
    title: "Subscribe to our newsletter",
    description: "The latest news and articles, sent to your inbox weekly.",
    buttonText: "Subscribe",
  },
  socials: [
    { platform: "facebook", url: "https://facebook.com" },
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "twitter", url: "https://twitter.com" },
    { platform: "github", url: "https://github.com" },
    { platform: "youtube", url: "https://youtube.com" },
  ],
  copyright: `© ${new Date().getFullYear()} The Cyber Library. All rights reserved.`,
};

function resolveIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "facebook": return <Facebook className="w-5 h-5" />;
    case "instagram": return <Instagram className="w-5 h-5" />;
    case "twitter": 
    case "x": return <Twitter className="w-5 h-5" />;
    case "github": return <Github className="w-5 h-5" />;
    case "youtube": return <Youtube className="w-5 h-5" />;
    default: return <div className="w-5 h-5 rounded-full bg-white/20" />;
  }
}

function FooterInner({ config }: { config: FooterConfig }) {
  return (
    <footer data-footer className="mt-12 border-t border-white/5 bg-[rgba(10,12,16,0.96)] relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent shadow-[0_0_20px_var(--accent)]" />

      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="grid grid-cols-2 gap-8 xl:col-span-2">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              {config.columns[0] && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--cream)]">{config.columns[0].title}</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {config.columns[0].links.map((item) => (
                      <li key={item.label}>
                        <Link href={item.url} className="text-sm text-[var(--cream-muted)] transition hover:text-[var(--accent)]">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {config.columns[1] && (
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold text-[var(--cream)]">{config.columns[1].title}</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {config.columns[1].links.map((item) => (
                      <li key={item.label}>
                        <Link href={item.url} className="text-sm text-[var(--cream-muted)] transition hover:text-[var(--accent)]">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              {config.columns[2] && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--cream)]">{config.columns[2].title}</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {config.columns[2].links.map((item) => (
                      <li key={item.label}>
                        <Link href={item.url} className="text-sm text-[var(--cream-muted)] transition hover:text-[var(--accent)]">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {config.columns[3] && (
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold text-[var(--cream)]">{config.columns[3].title}</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {config.columns[3].links.map((item) => (
                      <li key={item.label}>
                        <Link href={item.url} className="text-sm text-[var(--cream-muted)] transition hover:text-[var(--accent)]">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-10 xl:mt-0">
            <h3 className="text-sm font-semibold text-[var(--cream)]">{config.newsletter.title}</h3>
            <p className="mt-4 text-sm text-[var(--cream-muted)]">
              {config.newsletter.description}
            </p>
            <FooterNewsletterForm buttonText={config.newsletter.buttonText} />
          </div>
        </div>
        
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            {config.socials.filter(s => s.url).map((item) => (
              <a key={item.platform} href={item.url} target="_blank" rel="noopener noreferrer" className="text-[var(--cream-muted)] hover:text-[var(--cream)] transition">
                <span className="sr-only">{item.platform}</span>
                {resolveIcon(item.platform)}
              </a>
            ))}
          </div>
          <p className="mt-8 text-xs leading-5 text-[var(--cream-muted)] md:order-1 md:mt-0">
            {config.copyright}
          </p>
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
    } catch {
      // Keep default on parse error
    }
  }

  return <FooterInner config={config} />;
}

export async function Footer() {
  const session = await auth();
  if (session?.user) {
    return null;
  }

  return (
    <Suspense fallback={<FooterInner config={DEFAULT_FOOTER} />}>
      <FooterLoader />
    </Suspense>
  );
}
