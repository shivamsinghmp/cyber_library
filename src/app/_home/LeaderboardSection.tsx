"use client";

import { motion } from "framer-motion";
import { PlantLeaderboard } from "@/components/PlantLeaderboard";
import { fadeIn, staggerContainer } from "./animations";

export function LeaderboardSection() {
  return (
    <section className="bg-white py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
          <div className="mb-16 text-center">
            <motion.div variants={fadeIn}>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-600">
                🏆 Is Hafte Ke Toppers
              </span>
            </motion.div>
            <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>
              Sabse Zyada Padhne Wale
            </motion.h2>
            <motion.p variants={fadeIn} className="mt-4 text-lg" style={{ color: "var(--body-text)" }}>
              Ye students roz aate hain, roz padhte hain. Kya tu bhi inke saath rank karega?
            </motion.p>
          </div>
          <motion.div variants={fadeIn} className="mx-auto max-w-2xl">
            <PlantLeaderboard limit={5} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
