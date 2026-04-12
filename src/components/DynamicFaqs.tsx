"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type Faq = {
  id: string;
  question: string;
  answer: string;
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const fadeIn: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

export function DynamicFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFaqs(Array.isArray(data) ? data : []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || faqs.length === 0) return null;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={staggerContainer}
      className="mx-auto mt-40 mb-20 max-w-4xl relative z-10 px-4"
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full max-w-3xl rounded-full bg-[var(--wood)]/5 blur-[120px] pointer-events-none" />
      <div className="text-center mb-16 relative z-10">
        <motion.h2 variants={fadeIn} className="text-3xl font-extrabold text-[var(--cream)] md:text-5xl tracking-tight">
          Common Inquiries
        </motion.h2>
        <motion.p variants={fadeIn} className="mt-4 text-lg text-[var(--cream-muted)] font-medium">
          Everything you need to know about joining The Hub.
        </motion.p>
      </div>

      <div className="space-y-4 relative z-10">
        {faqs.map((faq, i) => (
          <motion.div
            variants={fadeIn}
            key={faq.id || i}
            className="group rounded-[1.5rem] border border-[var(--wood)]/10 bg-black/20 p-6 md:p-8 transition-colors hover:border-[var(--accent)]/30 hover:bg-black/40 backdrop-blur-md"
          >
            <h3 className="text-lg font-bold text-[var(--cream)] transition-colors group-hover:text-[var(--accent)]">
              {faq.question}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--cream-muted)] font-medium whitespace-pre-wrap">
              {faq.answer}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
