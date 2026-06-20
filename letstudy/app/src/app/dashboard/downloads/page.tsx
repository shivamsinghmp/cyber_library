"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, HardDriveDownload, Disc, Sparkles, Loader2, Package, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type DownloadItem = {
  id: string; productId: string; productName: string;
  downloadUrl: string | null; purchasedAt: string;
};

export default function MyDownloadsPage() {
  const [items, setItems]   = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/downloads", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        <p className="text-sm text-[var(--muted-text)] animate-pulse">Scanning vault…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
          <HardDriveDownload className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">My Downloads</h1>
          <p className="text-xs text-[var(--muted-text)]">Access purchased digital products from your permanent vault</p>
        </div>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-[var(--muted-text)] bg-[var(--page-bg)] border border-[var(--border)] px-2.5 py-1 rounded-full">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {/* Empty */}
      {items.length === 0 && (
        <div className="bg-white rounded-3xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--page-bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
            <Package className="w-9 h-9 text-[var(--muted-text)] opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Vault is Empty</h3>
          <p className="text-sm text-[var(--muted-text)] max-w-sm mx-auto mb-6">
            You haven't purchased any digital products yet. Visit the store to explore premium study materials.
          </p>
          <Link href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-brand)]">
            <Sparkles className="w-4 h-4" /> Browse Store
          </Link>
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <motion.div className="grid gap-4 md:grid-cols-2"
          initial="hidden" animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}>
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <motion.div key={item.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
                className="group bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6 flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:border-[var(--accent-border)] transition-all">

                {/* Product info */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all">
                    <Disc className="w-6 h-6 text-[var(--accent)] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--foreground)] leading-snug line-clamp-2">{item.productName}</h3>
                    <p className="flex items-center gap-1.5 text-xs text-[var(--muted-text)] mt-1.5">
                      <Clock className="w-3 h-3" />
                      Purchased {new Date(item.purchasedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Download button */}
                {item.downloadUrl ? (
                  <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-pale)] px-5 py-3 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all">
                    <Download className="w-4 h-4" /> Download Resource
                  </a>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-5 py-3 text-sm font-bold text-[var(--muted-text)] cursor-not-allowed">
                    Link Unavailable
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
