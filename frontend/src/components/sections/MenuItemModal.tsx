import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Leaf, Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/types";
import { BlurImage } from "@/components/ui/BlurImage";
import { SpiceLevelPicker } from "@/components/takeaway/SpiceLevelPicker";
import type { SpiceLevel } from "@/data/takeaway";

const badgeStyles: Record<string, string> = {
  Signature: "bg-gradient-ember text-primary-foreground",
  "Guest Favourite": "bg-secondary text-secondary-foreground border border-primary/40",
  "Most Ordered": "bg-accent text-accent-foreground",
};

export interface AddToBasketPayload {
  item: MenuItem;
  priceVariantLabel: string | null;
  unitPrice: number;
  quantity: number;
  spiceLevel: SpiceLevel | null;
}

/**
 * `onAddToBasket` is optional — passed by both the takeaway flow
 * (TakeawayBrowseMenuStep) and the public menu (MenuPage), so a customer can
 * add a dish to their takeaway basket from wherever they're browsing it.
 * When absent (e.g. an admin preview context), this renders read-only,
 * exactly as it did before basket support existed.
 */
export function MenuItemModal({
  item,
  onClose,
  onAddToBasket,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onAddToBasket?: (payload: AddToBasketPayload) => void;
}) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel | null>(null);

  // Reset the basket-picker state whenever a different item opens (or the
  // modal closes and reopens for the same one) — otherwise a variant/spice
  // choice from a previous item could silently carry over.
  useEffect(() => {
    setVariantIndex(0);
    setQuantity(1);
    setSpiceLevel(null);
  }, [item?.id]);

  const variants = item?.priceVariants?.length
    ? [{ label: item.priceLabel ?? "", price: item.price }, ...item.priceVariants]
    : null;
  const selectedVariant = variants?.[variantIndex];
  const unitPrice = selectedVariant ? selectedVariant.price : (item?.price ?? 0);

  function handleAdd() {
    if (!item || !onAddToBasket) return;
    onAddToBasket({
      item,
      priceVariantLabel: selectedVariant?.label || null,
      unitPrice,
      quantity,
      spiceLevel,
    });
    onClose();
  }

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
              className="absolute right-5 top-5 z-10 rounded-full border border-border bg-card/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>

            {item.imageUrl && (
              <BlurImage
                src={item.imageUrl}
                alt={item.name}
                className="-mx-8 -mt-8 mb-5 aspect-[16/10] w-[calc(100%+4rem)]"
              />
            )}

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

            {item.priceVariants?.length ? (
              <div className="mt-6 border-t border-border pt-5">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {[
                    { label: item.priceLabel ?? "", price: item.price },
                    ...item.priceVariants,
                  ].map((v, i) => (
                    <div key={i} className="flex items-center justify-between">
                      {v.label && <span className="text-sm text-muted-foreground">{v.label}</span>}
                      <span className="ml-auto font-display text-xl text-primary">ZMW {v.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</span>
                <span className="font-display text-2xl text-primary">ZMW {item.price}</span>
              </div>
            )}

            {onAddToBasket && (
              <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
                {variants && variants.length > 1 && (
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Choose an option
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setVariantIndex(i)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            i === variantIndex
                              ? "border-primary bg-secondary text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {v.label || "Standard"} · ZMW {v.price}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <SpiceLevelPicker value={spiceLevel} onChange={setSpiceLevel} optional />

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 rounded-full border border-border px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-foreground">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      aria-label="Increase quantity"
                      className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="btn-shine bg-gradient-ember shadow-warm flex-1 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
                  >
                    Add to Basket · ZMW {unitPrice * quantity}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
