"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, ArrowLeft, Package } from "lucide-react";

type DownloadItem = {
  id: string;
  productId: string;
  productName: string;
  downloadUrl: string | null;
  purchasedAt: string;
};

export default function MyDownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/downloads", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">My Downloads</h1>
      <p className="mt-1 text-sm text-[var(--cream-muted)]">Digital products you’ve purchased. Download anytime.</p>

      {loading ? (
        <div className="mt-8 flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-[var(--cream-muted)]" />
          <p className="mt-4 text-[var(--cream-muted)]">No downloads yet.</p>
          <Link href="/store" className="mt-3 inline-block text-[var(--accent)] hover:underline">Browse Store</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--cream)]">{item.productName}</p>
                <p className="text-xs text-[var(--cream-muted)]">Purchased {new Date(item.purchasedAt).toLocaleDateString()}</p>
              </div>
              {item.downloadUrl ? (
                <a
                  href={item.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)]/20 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/30"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              ) : (
                <span className="text-xs text-[var(--cream-muted)]">No download link set</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
