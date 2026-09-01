import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { branches } from "@/data/branches";
import type { BranchId } from "@/types";
import { useBasket } from "@/context/BasketContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { TakeawayOnlyBanner } from "@/components/takeaway/TakeawayOnlyBanner";
import { TakeawayBrowseMenuStep } from "@/components/takeaway/TakeawayBrowseMenuStep";
import { TakeawayReviewOrderStep } from "@/components/takeaway/TakeawayReviewOrderStep";
import { TakeawayCheckoutStep, type CreatedTakeawayOrder } from "@/components/takeaway/TakeawayCheckoutStep";
import { TakeawayPaymentStep, type TakeawayPaymentUploadResult } from "@/components/takeaway/TakeawayPaymentStep";
import { TakeawayConfirmationStep, type TakeawayConfirmation } from "@/components/takeaway/TakeawayConfirmationStep";

type Step = 1 | 2 | 3 | 4 | 5;

// Order flow per the spec: Select Branch (the route itself) -> Select Food
// / Spice Level / Add to Basket (step 1) -> Review Order + pickup time,
// gated behind the no-delivery acknowledgement (step 2) -> Checkout details,
// which is where the order actually gets created server-side (step 3) ->
// Payment, reusing the exact reservation OCR flow (step 4) -> Confirmation
// (step 5). Mirrors ReservePage.tsx's orchestrator shape.
export default function TakeawayPage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const basket = useBasket();

  // Skip straight to Review Order when arriving with a basket already built
  // for this branch — e.g. a customer added dishes from the public /menu
  // page and clicked "Order Takeaway" there. A basket for a different
  // branch (or none yet) still starts at Browse Menu as usual.
  const [step, setStep] = useState<Step>(() => (basket.lines.length > 0 && basket.branchId === branchId ? 2 : 1));
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [order, setOrder] = useState<CreatedTakeawayOrder | null>(null);
  const [confirmation, setConfirmation] = useState<TakeawayConfirmation | null>(null);

  useDocumentMeta({
    title: branch ? `Order Takeaway | ${branch.name}` : "Order Takeaway | Indish",
    description: branch
      ? `Order takeaway for pickup at ${branch.name} — no delivery available.`
      : undefined,
  });

  if (!branch) return <Navigate to="/" replace />;

  function handleCreated(created: CreatedTakeawayOrder) {
    setOrder(created);
    setStep(4);
  }

  function handleVerified(result: TakeawayPaymentUploadResult) {
    if (!order) return;
    setConfirmation({
      reference: order.reference,
      pickupDate: order.pickupDate,
      pickupTime: order.pickupTime,
      itemCount: basket.itemCount,
      totalAmount: order.totalAmount,
      status: result.orderStatus,
      internalPaymentId: result.internalPaymentId,
    });
    basket.clearBasket();
    setStep(5);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:px-0">
      <div className="mb-10 text-center">
        <span className="eyebrow">{branch.name}</span>
        <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Order Takeaway</h1>

        {step < 5 && <TakeawayOnlyBanner />}

        {step < 5 && (
          <div className="mx-auto mt-8 flex max-w-xs items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 1 && <TakeawayBrowseMenuStep branchId={branch.id} onContinue={() => setStep(2)} />}
          {step === 2 && (
            <TakeawayReviewOrderStep
              branchId={branch.id}
              pickupDate={pickupDate}
              pickupTime={pickupTime}
              onPickupDateChange={setPickupDate}
              onPickupTimeChange={setPickupTime}
              onContinue={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <TakeawayCheckoutStep
              branchId={branch.id}
              pickupDate={pickupDate}
              pickupTime={pickupTime}
              onCreated={handleCreated}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && order && (
            <TakeawayPaymentStep
              branchId={branch.id}
              reference={order.reference}
              totalAmount={order.totalAmount}
              onVerified={handleVerified}
            />
          )}
          {step === 5 && confirmation && <TakeawayConfirmationStep branch={branch} confirmation={confirmation} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
