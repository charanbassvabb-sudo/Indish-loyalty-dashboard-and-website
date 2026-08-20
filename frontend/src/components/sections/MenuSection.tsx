import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MenuCategory, MenuItem } from "@/types";
import { MenuCard } from "./MenuCard";
import { MenuItemModal } from "./MenuItemModal";

type DietFilter = "all" | "veg" | "non-veg";

export function MenuSection({
  categories: allCategories,
  compact = false,
}: {
  categories: MenuCategory[];
  compact?: boolean;
}) {
  // An admin-managed category (e.g. Chef's Specials) can legitimately have
  // zero items most of the time — don't show a dead tab for it, and don't
  // let it become the default-selected tab either.
  const categories = useMemo(() => allCategories.filter((c) => c.items.length > 0), [allCategories]);
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const [diet, setDiet] = useState<DietFilter>("all");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  const items = useMemo(() => {
    if (!active) return [];
    if (diet === "veg") return active.items.filter((i) => i.veg);
    if (diet === "non-veg") return active.items.filter((i) => !i.veg);
    return active.items;
  }, [active, diet]);

  return (
    <section id="menu" className="mx-auto max-w-7xl px-6 py-24 md:px-10">
      {!compact && (
        <div className="mb-12 text-center">
          <span className="eyebrow">The Menu</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            Every dish, <span className="text-gradient-ember">by category</span>
          </h2>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Menu categories"
        className="mb-6 flex flex-wrap justify-center gap-2 border-b border-border pb-6"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={cat.id === activeId}
            onClick={() => setActiveId(cat.id)}
            className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
              cat.id === activeId
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.id === activeId && (
              <motion.span
                layoutId="menu-tab-bg"
                className="bg-gradient-ember absolute inset-0 rounded-full"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative z-10">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="mb-10 flex justify-center gap-2">
        {(["all", "veg", "non-veg"] as DietFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDiet(f)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              diet === f
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "veg" ? "Vegetarian" : "Non-Vegetarian"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${active?.id}-${diet}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <MenuCard key={item.id} item={item} onSelect={setSelected} />
          ))}
          {items.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No dishes match this filter in this category yet.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      <MenuItemModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
