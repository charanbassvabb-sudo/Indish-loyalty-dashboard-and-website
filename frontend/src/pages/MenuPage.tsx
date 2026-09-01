import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Printer, Loader2, ShoppingBasket } from "lucide-react";
import { branches } from "@/data/branches";
import { MenuSection } from "@/components/sections/MenuSection";
import type { AddToBasketPayload } from "@/components/sections/MenuItemModal";
import { useBasket } from "@/context/BasketContext";
import { useToast } from "@/context/ToastContext";
import type { BranchId } from "@/types";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useMenu } from "@/hooks/useMenu";

// Lets a customer add straight to a takeaway basket while browsing the
// public menu, instead of having to remember a dish's name and category and
// re-find it on the separate /takeaway page. Shares the same BasketContext
// (provided at the app root) as TakeawayBrowseMenuStep, so items added here
// are already sitting in the basket when they land on /takeaway.
export default function MenuPage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const { categories, loading, error } = useMenu(branchId);
  const basket = useBasket();
  const { toast } = useToast();
  const navigate = useNavigate();

  useDocumentMeta({
    title: branch ? `Menu | ${branch.name}` : "Menu | Indish",
    description: branch
      ? `Browse the full tandoor-fired, fusion-forward Indian menu at ${branch.name} — starters, curries, biryani, and signature dishes.`
      : undefined,
  });

  if (!branch) return <Navigate to="/" replace />;

  // The basket already holds items from the other branch — don't silently
  // wipe them just because the customer is now browsing this branch's menu;
  // make them choose, same guard as TakeawayBrowseMenuStep.
  const branchMismatch = basket.branchId !== null && basket.branchId !== branch.id && basket.lines.length > 0;

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
      branch.id,
    );
    toast({ title: "Added to basket", description: payload.item.name, variant: "success" });
  }

  return (
    <div className="pb-24 pt-32">
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

      {!loading && !error && branchMismatch && (
        <div className="card-warm mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
          <ShoppingBasket className="h-8 w-8 text-accent" />
          <p className="text-sm text-foreground">
            Your basket has items from a different branch. Adding a dish here will clear them first.
          </p>
          <button
            type="button"
            onClick={() => basket.setBranch(branch.id)}
            className="bg-gradient-ember shadow-warm rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Start fresh for this branch
          </button>
        </div>
      )}
      {!loading && !error && !branchMismatch && (
        <MenuSection categories={categories} compact onAddToBasket={handleAdd} />
      )}

      {!branchMismatch && basket.lines.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto mt-8 flex max-w-4xl items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-lift backdrop-blur-sm md:mx-10">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ShoppingBasket className="h-4 w-4 text-primary" />
            <span className="font-semibold">
              {basket.itemCount} item{basket.itemCount === 1 ? "" : "s"}
            </span>
            <span className="text-muted-foreground">· ZMW {basket.subtotal}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/${branch.id}/takeaway`)}
            className="btn-shine bg-gradient-ember shadow-warm rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Order Takeaway
          </button>
        </div>
      )}
    </div>
  );
}
