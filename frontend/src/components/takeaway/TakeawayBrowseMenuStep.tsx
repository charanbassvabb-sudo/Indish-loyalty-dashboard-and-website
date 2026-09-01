import { Loader2, ShoppingBasket } from "lucide-react";
import { MenuSection } from "@/components/sections/MenuSection";
import type { AddToBasketPayload } from "@/components/sections/MenuItemModal";
import { useBasket } from "@/context/BasketContext";
import { useToast } from "@/context/ToastContext";
import { useMenu } from "@/hooks/useMenu";
import type { BranchId } from "@/types";

export function TakeawayBrowseMenuStep({ branchId, onContinue }: { branchId: BranchId; onContinue: () => void }) {
  const { categories, loading, error } = useMenu(branchId);
  const basket = useBasket();
  const { toast } = useToast();

  // The basket already holds items from a different branch — don't silently
  // wipe them just because the customer navigated here; make them choose.
  const branchMismatch = basket.branchId !== null && basket.branchId !== branchId && basket.lines.length > 0;

  function handleAdd(payload: AddToBasketPayload) {
    basket.addLine(
      {
        menuItemId: payload.item.id,
        nameSnapshot: payload.item.name,
        priceVariantLabel: payload.priceVariantLabel,
        unitPrice: payload.unitPrice,
        quantity: payload.quantity,
        spiceLevel: payload.spiceLevel,
        imageUrl: payload.item.imageUrl,
      },
      branchId,
    );
    toast({ title: "Added to basket", description: payload.item.name, variant: "success" });
  }

  if (branchMismatch) {
    return (
      <div className="card-warm flex flex-col items-center gap-4 p-8 text-center">
        <ShoppingBasket className="h-8 w-8 text-accent" />
        <p className="text-sm text-foreground">
          Your basket has items from a different branch. Starting an order here will clear them first.
        </p>
        <button
          type="button"
          onClick={() => basket.setBranch(branchId)}
          className="bg-gradient-ember shadow-warm rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          Start fresh for this branch
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Browse the menu, tap a dish to pick a spice level and add it to your basket.
      </p>

      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading menu" />
        </div>
      )}
      {error && <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>}
      {!loading && !error && <MenuSection categories={categories} compact onAddToBasket={handleAdd} />}

      {basket.lines.length > 0 && (
        <div className="sticky bottom-4 z-30 mt-8 flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-lift backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ShoppingBasket className="h-4 w-4 text-primary" />
            <span className="font-semibold">
              {basket.itemCount} item{basket.itemCount === 1 ? "" : "s"}
            </span>
            <span className="text-muted-foreground">· ZMW {basket.subtotal}</span>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="btn-shine bg-gradient-ember shadow-warm rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Review Order
          </button>
        </div>
      )}
    </div>
  );
}
