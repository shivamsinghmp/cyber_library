"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, ShoppingCart, Star, Zap, Download, ChevronRight, Search } from "lucide-react";
import { motion } from "framer-motion";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

const fadeIn = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
};
const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const CARD_ACCENTS = [
  { top: "linear-gradient(to right, #6366F1, #8B5CF6)", badge: "#EEF2FF", badgeText: "#4F46E5" },
  { top: "linear-gradient(to right, #06B6D4, #3B82F6)", badge: "#ECFEFF", badgeText: "#0891B2" },
  { top: "linear-gradient(to right, #F59E0B, #EF4444)", badge: "#FFFBEB", badgeText: "#D97706" },
  { top: "linear-gradient(to right, #10B981, #06B6D4)", badge: "#ECFDF5", badgeText: "#059669" },
  { top: "linear-gradient(to right, #8B5CF6, #EC4899)", badge: "#F5F3FF", badgeText: "#7C3AED" },
  { top: "linear-gradient(to right, #F43F5E, #F59E0B)", badge: "#FFF1F2", badgeText: "#BE123C" },
];

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/store/products")
      .then(r => r.ok ? r.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative overflow-hidden min-h-screen" style={{ background: "var(--page-bg)" }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08), transparent)" }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle, #6366F110 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">

        {/* ── HEADER ── */}
        <motion.div initial="hidden" animate="visible" variants={stagger}
          className="mb-12 max-w-3xl">

          <motion.div variants={fadeIn} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em]"
              style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
              <ShoppingBag className="h-3.5 w-3.5" />
              Premium Digital Store
            </span>
          </motion.div>

          <motion.h1 variants={fadeIn}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ color: "var(--foreground)" }}>
            Study Material{" "}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              Store
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="mt-3 text-lg" style={{ color: "var(--body-text)" }}>
            Notes, planners and trackers made by top students — buy once, use forever.
          </motion.p>

          {/* Feature pills */}
          <motion.div variants={fadeIn} className="mt-5 flex flex-wrap gap-3">
            {[
              { icon: <Download className="h-3.5 w-3.5" />, text: "Instant download" },
              { icon: <Zap className="h-3.5 w-3.5" />,      text: "PDF & digital format" },
              { icon: <Star className="h-3.5 w-3.5" />,     text: "Toppers verified" },
              { icon: <ShoppingCart className="h-3.5 w-3.5" />, text: "Secure payment" },
            ].map((p, i) => (
              <span key={i}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold"
                style={{ borderColor: "var(--border)", background: "white", color: "var(--muted-text)" }}>
                {p.icon} {p.text}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── SEARCH BAR ── */}
        {!loading && products.length > 3 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="mb-8 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--muted-text)" }} />
              <input
                type="text"
                placeholder="Search materials…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-2xl border bg-white pl-11 pr-4 py-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              />
            </div>
          </motion.div>
        )}

        {/* ── LOADING SKELETONS ── */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="overflow-hidden rounded-[1.75rem] border bg-white"
                style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="skeleton h-2 w-full" />
                <div className="skeleton mx-5 mt-5 aspect-[4/3] rounded-xl" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-4 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-full rounded-lg" />
                  <div className="skeleton h-3 w-2/3 rounded-lg" />
                  <div className="skeleton h-10 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>

        /* ── EMPTY ── */
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-sm rounded-2xl border bg-white py-16 text-center px-8"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
              <ShoppingBag className="h-8 w-8" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
              {search ? "Nothing found" : "No Products Yet"}
            </h3>
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>
              {search
                ? `No match for "${search}". Try something else.`
                : "New items will be added soon — check back shortly!"}
            </p>
            {search && (
              <button onClick={() => setSearch("")}
                className="mt-5 rounded-full px-6 py-2 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                Show All
              </button>
            )}
          </motion.div>

        /* ── PRODUCTS GRID ── */
        ) : (
          <>
            {search && (
              <p className="mb-5 text-sm font-semibold" style={{ color: "var(--muted-text)" }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
              </p>
            )}

            <motion.div
              variants={stagger} initial="hidden" animate="visible"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product, idx) => {
                const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
                return (
                  <motion.div key={product.id} variants={fadeIn}
                    whileHover={{ y: -6, transition: { duration: 0.25 } }}>
                    <Link href={`/store/${product.id}`}
                      className="group flex flex-col overflow-hidden rounded-[1.75rem] border bg-white transition-shadow hover:shadow-[var(--shadow-lg)]"
                      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>

                      {/* Color top stripe */}
                      <div className="h-1.5 w-full" style={{ background: accent.top }} />

                      {/* Product image */}
                      <div className="relative mx-4 mt-4 overflow-hidden rounded-xl"
                        style={{ aspectRatio: "4/3", background: "var(--page-bg)" }}>
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                              style={{ background: accent.badge, border: `2px solid ${accent.badgeText}20` }}>
                              <ShoppingBag className="h-8 w-8" style={{ color: accent.badgeText }} />
                            </div>
                            <p className="text-xs font-semibold" style={{ color: "var(--muted-text)" }}>
                              Digital Product
                            </p>
                          </div>
                        )}

                        {/* Price overlay */}
                        <div className="absolute bottom-2 right-2">
                          <span className="rounded-xl px-3 py-1.5 text-sm font-extrabold backdrop-blur-md"
                            style={{
                              background: product.price === 0 ? "#ECFDF5" : "rgba(15,23,42,0.85)",
                              color: product.price === 0 ? "#059669" : "white",
                            }}>
                            {product.price === 0 ? "FREE" : `₹${product.price}`}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-5">
                        {/* Category badge */}
                        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                          style={{ background: accent.badge, color: accent.badgeText }}>
                          <Download className="h-3 w-3" />
                          Digital Download
                        </span>

                        <h2 className="text-base font-extrabold leading-snug transition-colors group-hover:text-[var(--accent)] line-clamp-2"
                          style={{ color: "var(--foreground)" }}>
                          {product.name}
                        </h2>

                        {product.description && (
                          <p className="mt-2 text-sm leading-relaxed line-clamp-2"
                            style={{ color: "var(--body-text)" }}>
                            {product.description}
                          </p>
                        )}

                        {/* Star rating (static) */}
                        <div className="mt-3 flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: "var(--muted-text)" }}>
                            Toppers verified
                          </span>
                        </div>

                        {/* CTA row */}
                        <div className="mt-5 flex items-center justify-between">
                          <div>
                            <p className="text-xl font-extrabold" style={{ color: "var(--foreground)" }}>
                              {product.price === 0 ? "Free" : `₹${product.price}`}
                            </p>
                            {product.price > 0 && (
                              <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>
                                one-time payment
                              </p>
                            )}
                          </div>
                          <span
                            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-white transition-all group-hover:gap-2.5"
                            style={{
                              background: accent.top,
                              boxShadow: `0 4px 12px ${accent.badgeText}40`,
                            }}>
                            View
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}

        {/* ── BOTTOM BANNER ── */}
        {!loading && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-14 overflow-hidden rounded-2xl border p-px"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-[calc(1rem-1px)] px-8 py-6"
              style={{ background: "linear-gradient(135deg, #EEF2FF, #FFFFFF, #F5F3FF)" }}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
                  🎯
                </div>
                <div>
                  <p className="font-extrabold" style={{ color: "var(--foreground)" }}>
                    Try a free study session first!
                  </p>
                  <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                    Study rooms are completely free — join now and get focused.
                  </p>
                </div>
              </div>
              <Link href="/study-room"
                className="shrink-0 group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-extrabold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 6px 20px rgba(99,102,241,0.35)" }}>
                <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                Join Study Room →
              </Link>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
