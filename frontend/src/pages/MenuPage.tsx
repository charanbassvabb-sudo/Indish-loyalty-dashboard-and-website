import { Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Printer, Loader2 } from "lucide-react";
import { branches } from "@/data/branches";
import { MenuSection } from "@/components/sections/MenuSection";
import type { BranchId } from "@/types";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useMenu } from "@/hooks/useMenu";

export default function MenuPage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const { categories, loading, error } = useMenu(branchId);

  useDocumentMeta({
    title: branch ? `Menu | ${branch.name}` : "Menu | Indish",
    description: branch
      ? `Browse the full tandoor-fired, fusion-forward Indian menu at ${branch.name} — starters, curries, biryani, and signature dishes.`
      : undefined,
  });

  if (!branch) return <Navigate to="/" replace />;

  return (
    <div className="pt-32">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          {branch.name}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 font-display text-5xl text-foreground md:text-6xl"
        >
          The Full Menu
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onClick={() => window.print()}
          className="no-print mx-auto mt-6 flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Printer className="h-4 w-4" />
          Print Menu
        </motion.button>
      </div>

      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading menu" />
        </div>
      )}
      {error && <p className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-muted-foreground">{error}</p>}
      {!loading && !error && <MenuSection categories={categories} compact />}
    </div>
  );
}
