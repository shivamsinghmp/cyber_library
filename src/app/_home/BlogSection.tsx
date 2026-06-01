"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "./animations";

type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
};

const GRADIENTS = [
  "linear-gradient(to right, #6366F1, #8B5CF6)",
  "linear-gradient(to right, #8B5CF6, #06B6D4)",
  "linear-gradient(to right, #06B6D4, #10B981)",
];

export function BlogSection({ blogs }: { blogs: Blog[] }) {
  if (blogs.length === 0) return null;

  return (
    <section className="relative py-28">
      <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
          <div className="mb-12 flex flex-col justify-between md:flex-row md:items-end">
            <div>
              <motion.div variants={fadeIn}>
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  Padhai ke Tips
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: "var(--foreground)" }}>
                Blog & Resources
              </motion.h2>
            </div>
            <motion.div variants={fadeIn} className="mt-6 md:mt-0">
              <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "white", color: "var(--foreground)", boxShadow: "var(--shadow-sm)" }}>
                View All Articles
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            </motion.div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {blogs.map((blog, i) => (
              <motion.div variants={fadeIn} key={blog.id} className="group flex flex-col overflow-hidden rounded-[2rem] border bg-white transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="h-1.5 w-full" style={{ background: GRADIENTS[i % 3] }} />
                <div className="flex-1 p-8">
                  <div className="mb-4">
                    <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--accent-pale)", color: "var(--accent)" }}>
                      {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                    </span>
                  </div>
                  <h3 className="mb-3 line-clamp-2 text-xl font-bold transition-colors group-hover:text-[var(--accent)]" style={{ color: "var(--foreground)" }}>{blog.title}</h3>
                  <p className="line-clamp-3 text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{blog.excerpt || "Read more about this topic..."}</p>
                </div>
                <div className="border-t p-5" style={{ borderColor: "var(--border)" }}>
                  <Link href={`/blog/${blog.slug}`} className="inline-flex items-center gap-2 text-sm font-bold transition-colors" style={{ color: "var(--accent)" }}>
                    Read Article
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
