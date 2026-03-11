import Link from "next/link";
import { FooterContact } from "./FooterContact";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-[rgba(8,5,3,0.96)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div id="contact" className="flex flex-col gap-4 text-xs text-[var(--cream-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Virtual Library – The Focus Hub.</p>
          <FooterContact />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--cream-muted)]">
          <Link href="/privacy" className="transition hover:text-[var(--cream)]/90">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-[var(--cream)]/90">
            Terms &amp; Conditions
          </Link>
          <Link href="/refund" className="transition hover:text-[var(--cream)]/90">
            Refund Policy
          </Link>
          <Link href="/shipping" className="transition hover:text-[var(--cream)]/90">
            Shipping Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}

