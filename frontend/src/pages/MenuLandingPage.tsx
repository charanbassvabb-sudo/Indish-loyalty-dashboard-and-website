import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { branchList } from "@/data/branches";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Button } from "@/components/ui/button";

// Standalone "which branch's menu?" page — this is what the printed "See
// our menu" QR code points at, so one code works no matter which branch a
// guest is scanning it in. Not branch-scoped (no :branchId in its route) on
// purpose, same as BranchSelectPage; each card just hands off to that
// branch's real menu route (/:branchId/menu).
export default function MenuLandingPage() {
  useDocumentMeta({
    title: "Our Menu | Indish",
    description: "View the Indish menu — pick your branch (Lusaka or Kitwe) to see dishes and prices.",
    canonical: "https://www.indishzambia.com/menu",
    noindex: true,
  });

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-24 text-center">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="eyebrow"
      >
        Indish
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 max-w-xl font-display text-4xl text-foreground md:text-5xl"
      >
        View our <span className="text-gradient-ember">menu</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-4 max-w-md text-sm text-muted-foreground md:text-base"
      >
        Which branch are you at?
      </motion.p>

      <div className="mt-10 grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        {branchList.map((branch, i) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to={`/${branch.id}/menu`}
              className="card-warm group flex flex-col items-center gap-3 p-8 transition-transform hover:scale-[1.02]"
            >
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {branch.name}
              </span>
              <Button asChild variant="default" size="lg" className="mt-2 pointer-events-none">
                <span>
                  {branch.name.replace("Indish — ", "")} menu
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
