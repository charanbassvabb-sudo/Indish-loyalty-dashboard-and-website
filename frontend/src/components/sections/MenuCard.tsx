import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import type { MenuItem } from "@/types";
import { useTiltSpotlight } from "@/hooks/useTiltSpotlight";
import { formatMenuPrice } from "@/lib/utils";
import { BlurImage } from "@/components/ui/BlurImage";

const badgeStyles: Record<string, string> = {
  Signature: "bg-gradient-ember text-primary-foreground",
  "Guest Favourite": "bg-secondary text-secondary-foreground border border-primary/40",
  "Most Ordered": "bg-accent text-accent-foreground",
  "Chef's Special": "bg-gold text-background border border-gold",
};

export function MenuCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  const tilt = useTiltSpotlight<HTMLButtonElement>({ max: 6 });

  return (
    <motion.button
      ref={tilt.ref}
      layout
      type="button"
      onClick={() => onSelect(item)}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={tilt.style}
      className="card-warm spotlight-card group flex w-full flex-col gap-3 overflow-hidden p-5 text-left transition-shadow hover:shadow-warm"
    >
      {item.imageUrl && (
        <BlurImage
          src={item.imageUrl}
          alt={item.name}
          className="-mx-5 -mt-5 mb-1 aspect-[4/3] w-[calc(100%+2.5rem)]"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg text-foreground transition-colors group-hover:text-primary md:text-xl">
          {item.name}
        </h3>
        <span
          className={`font-display text-primary ${
            item.priceVariants?.length ? "text-right text-sm leading-tight" : "whitespace-nowrap text-lg"
          }`}
        >
          {formatMenuPrice(item)}
        </span>
      </div>

      {(item.badges?.length || item.veg) && (
        <div className="relative z-10 flex flex-wrap gap-2">
          {item.veg && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-400">
              <Leaf className="h-2.5 w-2.5" />
              Veg
            </span>
          )}
          {item.badges?.map((badge) => (
            <span
              key={badge}
              className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${badgeStyles[badge]}`}
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      <span className="relative z-10 text-xs font-medium text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
        Tap to view details →
      </span>
    </motion.button>
  );
}
