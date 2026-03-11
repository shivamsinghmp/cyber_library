"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, ChevronRight } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/store/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--cream)] md:text-4xl">Digital Store</h1>
        <p className="mt-2 text-[var(--cream-muted)]">PDFs, courses, and digital resources. Buy once, download anytime.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-white/10 bg-black/20" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-[var(--cream-muted)]" />
          <p className="mt-4 text-[var(--cream-muted)]">No products available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/store/${p.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 transition hover:border-[var(--accent)]/30 hover:bg-black/35"
            >
              <div className="relative aspect-[4/3] bg-black/40">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="h-16 w-16 text-white/10" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-sm font-semibold text-[var(--accent)]">
                  ₹{p.price}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-semibold text-[var(--cream)] group-hover:text-[var(--accent)]">{p.name}</h2>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--cream-muted)]">{p.description}</p>
                )}
                <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-[var(--accent)]">
                  View & buy
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
