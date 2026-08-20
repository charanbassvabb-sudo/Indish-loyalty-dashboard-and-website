import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useParams } from "react-router-dom";
import { CalendarCheck, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { branches } from "@/data/branches";
import type { BranchId } from "@/types";

/**
 * Mobile-only sticky CTA that slides in once the guest has scrolled past the
 * hero, so "Reserve a table" is always one thumb-tap away. Hidden on the
 * reserve flow itself (no point nudging someone already booking) and on
 * routes without a resolved branch.
 */
export function StickyReserveBar() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const isReservePage = location.pathname.endsWith("/reserve");
  const show = visible && branch && !isReservePage;

  return (
    <AnimatePresence>
      {show && branch && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <a
            href={`tel:${branch.phone}`}
            aria-label={`Call ${branch.name}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
          >
            <Phone className="h-4 w-4" />
          </a>
          <Link
            to={`/${branch.id}/reserve`}
            className="bg-gradient-ember shadow-warm flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground"
          >
            <CalendarCheck className="h-4 w-4" />
            Reserve a Table
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
