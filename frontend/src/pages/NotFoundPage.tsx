import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import { branches } from "@/data/branches";
import type { BranchId } from "@/types";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function NotFoundPage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const homeHref = branch ? `/${branch.id}` : "/";

  useDocumentMeta({ title: "Page Not Found | Indish", noindex: true });

  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <span className="font-display text-[16rem] leading-none text-primary/5 md:text-[26rem]">
          404
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: [0, -10, 0] }}
        transition={{ opacity: { duration: 0.5 }, y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-card shadow-warm"
      >
        <UtensilsCrossed className="h-8 w-8 text-primary" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-8 font-display text-4xl text-foreground md:text-5xl"
      >
        This table isn&apos;t set
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-4 max-w-md text-sm text-muted-foreground md:text-base"
      >
        We couldn&apos;t find the page you were looking for. It may have moved, or the link might
        be off by a digit or two.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-8 flex flex-wrap justify-center gap-4"
      >
        <Link
          to={homeHref}
          className="bg-gradient-ember shadow-warm flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          Back to {branch ? branch.name : "Indish"}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {branch && (
          <Link
            to={`/${branch.id}/menu`}
            className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            View Menu
          </Link>
        )}
      </motion.div>
    </div>
  );
}
