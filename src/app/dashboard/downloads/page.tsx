"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, ArrowLeft, Package, HardDriveDownload, Sparkles, Loader2, Disc } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--cream-muted)] animate-pulse">Scanning Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 relative">
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-[80px] pointer-events-none"></div>
      
      <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--cream-muted)] transition-colors hover:text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col gap-2">
         <h1 className="flex items-center gap-3 text-3xl font-extrabold text-[var(--cream)] md:text-4xl tracking-tight">
           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">
              <HardDriveDownload className="h-6 w-6" />
           </div>
           My Downloads
         </h1>
         <p className="text-sm font-medium text-[var(--cream-muted)] lg:text-base">
           Access your purchased digital products anytime from your permanent vault.
         </p>
      </motion.div>

      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/40 p-12 text-center shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-50 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center justify-center">
             <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 mb-6 border border-white/10 shadow-inner">
                 <Package className="h-10 w-10 text-[var(--cream-muted)] opacity-60" />
             </div>
             <h3 className="text-xl font-bold text-[var(--cream)] md:text-2xl">Vault is Empty</h3>
             <p className="mt-2 text-sm text-[var(--cream-muted)] max-w-md">You haven't added any digital items to your collection yet. Visit the store to explore premium content.</p>
             <Link href="/store" className="mt-8 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] transition-transform hover:scale-105 active:scale-95">
               <Sparkles className="h-4 w-4" /> Browse Store
             </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
           <AnimatePresence mode="popLayout">
             {items.map((item) => (
               <motion.div
                 key={item.id}
                 variants={itemVariants}
                 className="group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur-md transition-all hover:border-[var(--accent)]/40 hover:bg-black/60 hover:-translate-y-1"
               >
                 <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/0 blur-[30px] transition-colors duration-500 group-hover:bg-[var(--accent)]/10 pointer-events-none"></div>
                 
                 <div className="relative z-10 mb-6 flex items-start gap-4">
                    <div className="flex shrink-0 h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-[var(--cream)] border border-white/10 group-hover:border-[var(--accent)]/30 group-hover:text-[var(--accent)] transition-colors">
                       <Disc className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold leading-tight text-[var(--cream)] line-clamp-2 md:text-xl">
                        {item.productName}
                      </h3>
                      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--cream-muted)]">
                        Purchased {new Date(item.purchasedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                 </div>

                 <div className="relative z-10 mt-auto">
                   {item.downloadUrl ? (
                     <a
                       href={item.downloadUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold tracking-wide text-[var(--cream)] border border-white/5 transition-all hover:bg-[var(--accent)] hover:text-[var(--ink)] hover:border-transparent hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
                     >
                       <Download className="h-4 w-4" />
                       Download Resource
                     </a>
                   ) : (
                     <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 px-5 py-3 text-sm font-bold tracking-wide text-white/30 cursor-not-allowed">
                        Link Unavailable
                     </div>
                   )}
                 </div>
               </motion.div>
             ))}
           </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
