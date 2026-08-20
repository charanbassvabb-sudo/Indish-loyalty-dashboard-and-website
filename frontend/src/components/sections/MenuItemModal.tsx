import { AnimatePresence, motion } from "framer-motion";
import { X, Leaf } from "lucide-react";
import type { MenuItem } from "@/types";

const badgeStyles: Record<string, string> = {
  Signature: "bg-gradient-ember text-primary-foreground",
  "Guest Favourite": "bg-secondary text-secondary-foreground border border-primary/40",
  "Most Ordered": "bg-accent text-accent-foreground",
};

export function MenuItemModal({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="menu-item-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
        >
          <motion.div
            key={item.id}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="card-warm relative max-h-[85vh] w-full max-w-md overflow-x-hidden overflow-y-auto p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
              style={{ background: "var(--gradient-ember)" }}
            />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-5 top-5 rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative mb-3 flex flex-wrap items-center gap-2">
              {item.veg && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-400">
                  <Leaf className="h-3 w-3" />
                  Veg
                </span>
              )}
              {item.badges?.map((badge) => (
                <span
                  key={badge}
                  className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${badgeStyles[badge]}`}
                >
                  {badge}
                </span>
              ))}
            </div>

            <h3 className="font-display text-2xl leading-tight text-foreground md:text-3xl">
              {item.name}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              {item.description}
            </p>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</span>
              <span className="font-display text-2xl text-primary">ZMW {item.price}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
