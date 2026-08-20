import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { StatusPill } from "./StatusPill";
import type { ReservationStatus } from "@/types/admin";

// PENDING_PAYMENT is deliberately excluded — it's a system-assigned starting
// state, not something staff pick as a quick fix, and leaving it out avoids
// ever re-triggering the "payment confirmed" WhatsApp message a second time
// (see reservation.controller.ts's becomingConfirmed check) if an admin
// undoes their way back through it.
const QUICK_STATUSES: ReservationStatus[] = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

/**
 * A StatusPill that opens a small menu of the other statuses on click —
 * lets an admin fix a reservation's status right from the table row instead
 * of opening the full edit drawer. See AdminReservationsTab's
 * changeStatusWithUndo for what happens after a pick.
 *
 * The menu is rendered into a portal at document.body rather than inline —
 * table rows here animate on hover (`whileHover={{ scale: ... }}`), and a
 * CSS transform on an ancestor creates a new containing block for
 * `position: absolute` descendants, which made an in-place dropdown get
 * visually buried under sibling cells' content despite a higher z-index.
 * Positioning from the trigger's own bounding box sidesteps that class of
 * bug entirely instead of chasing z-index numbers.
 */
export function StatusQuickMenu({
  status,
  onChange,
}: {
  status: ReservationStatus;
  onChange: (next: ReservationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Closing on scroll (rather than re-tracking position live) keeps this
    // simple — the table/page scrolling away from a still-open menu is rare
    // and this avoids a scroll-linked re-render on every frame.
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openMenu();
        }}
        className="group flex items-center gap-1 rounded-full transition-transform hover:scale-105"
      >
        <StatusPill status={status} />
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", top: coords.top, left: coords.left }}
              className="z-[100] w-44 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lift"
            >
              {QUICK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={s === status}
                  onClick={() => {
                    setOpen(false);
                    onChange(s);
                  }}
                  className="flex w-full items-center rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <StatusPill status={s} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
