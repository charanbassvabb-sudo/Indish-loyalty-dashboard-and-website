import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useBasket } from "@/context/BasketContext";
import { TakeawayOnlyBanner } from "./TakeawayOnlyBanner";
import {
  isPickupTimeBookable,
  getPickupWindow,
  getBranchHoursNote,
  MIN_PICKUP_LEAD_MINUTES,
  MAX_PICKUP_ADVANCE_HOURS,
} from "@/data/takeaway";
import { isRecurringlyClosed, getRecurringClosureNote } from "@/data/reservation";
import { DateCalendarPicker } from "@/components/ui/DateCalendarPicker";
import type { BranchId } from "@/types";

const SPICE_LABEL: Record<string, string> = { MILD: "Mild", MEDIUM: "Medium", HOT: "Hot" };

export function TakeawayReviewOrderStep({
  branchId,
  pickupDate,
  pickupTime,
  onPickupDateChange,
  onPickupTimeChange,
  onContinue,
  onBack,
}: {
  branchId: BranchId;
  pickupDate: string;
  pickupTime: string;
  onPickupDateChange: (value: string) => void;
  onPickupTimeChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const basket = useBasket();
  const [acknowledged, setAcknowledged] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + MAX_PICKUP_ADVANCE_HOURS * 60 * 60 * 1000).toISOString().slice(0, 10);
  const pickupWindow = getPickupWindow(pickupDate, branchId);

  function handlePickupDateChange(value: string) {
    onPickupDateChange(value);
    // Reset a time that no longer falls inside the new date's opening hours
    // (e.g. switching off a longer Fri–Sun day) rather than silently
    // carrying over a now-invalid selection.
    const window = getPickupWindow(value, branchId);
    if (window && pickupTime && (pickupTime < window.open || pickupTime > window.close)) {
      onPickupTimeChange("");
    }
  }

  function validateAndContinue() {
    if (!pickupDate || !pickupTime) {
      setPickupError("Please choose a pickup date and time");
      return;
    }
    if (isRecurringlyClosed(pickupDate, branchId)) {
      setPickupError(`${getRecurringClosureNote(branchId)} — please pick another date`);
      return;
    }
    if (!isPickupTimeBookable(pickupDate, pickupTime, branchId)) {
      setPickupError(
        pickupWindow
          ? getBranchHoursNote(pickupDate, branchId)
          : `Pickup must be within ${MAX_PICKUP_ADVANCE_HOURS} hours from now`,
      );
      return;
    }
    setPickupError(null);
    onContinue();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card-warm flex flex-col divide-y divide-border/60 p-2">
        {basket.lines.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Your basket is empty.</p>
        )}
        {basket.lines.map((line) => (
          <div key={line.key} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-[10rem] flex-1">
              <p className="text-sm font-medium text-foreground">{line.nameSnapshot}</p>
              <p className="text-xs text-muted-foreground">
                {line.priceVariantLabel ? `${line.priceVariantLabel} · ` : ""}
                {line.spiceLevel ? `${SPICE_LABEL[line.spiceLevel]} spice · ` : ""}
                ZMW {line.unitPrice} each
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
              <button
                type="button"
                onClick={() => basket.updateLineQuantity(line.key, line.quantity - 1)}
                aria-label="Decrease quantity"
                className="rounded-full p-1 text-muted-foreground hover:text-primary"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-semibold text-foreground">{line.quantity}</span>
              <button
                type="button"
                onClick={() => basket.updateLineQuantity(line.key, line.quantity + 1)}
                aria-label="Increase quantity"
                className="rounded-full p-1 text-muted-foreground hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="w-20 text-right text-sm font-semibold text-foreground">
              ZMW {line.unitPrice * line.quantity}
            </span>
            <button
              type="button"
              onClick={() => basket.removeLine(line.key)}
              aria-label="Remove item"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="card-warm flex items-center justify-between p-5">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="font-display text-2xl text-primary">ZMW {basket.subtotal}</span>
      </div>

      <TakeawayOnlyBanner size="lg" />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup Date</span>
        <DateCalendarPicker
          value={pickupDate}
          onChange={handlePickupDateChange}
          minDate={today}
          maxDate={maxDate}
          isDateDisabled={(date) =>
            isRecurringlyClosed(date, branchId)
              ? { disabled: true, reason: getRecurringClosureNote(branchId) }
              : { disabled: false }
          }
          helperText={`Only dates within the next ${MAX_PICKUP_ADVANCE_HOURS} hours can be selected`}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup Time</span>
        <input
          type="time"
          min={pickupWindow?.open}
          max={pickupWindow?.close}
          value={pickupTime}
          onChange={(e) => onPickupTimeChange(e.target.value)}
          className="field"
        />
      </label>
      {pickupDate && !isRecurringlyClosed(pickupDate, branchId) && (
        <p className="text-xs text-muted-foreground">{getBranchHoursNote(pickupDate, branchId)}</p>
      )}
      {pickupError && <p className="text-xs text-destructive">{pickupError}</p>}

      <label className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-sm text-foreground">
          I understand this is a <strong>pickup-only order — no delivery is available</strong>. I'll collect it
          myself at the selected branch.
        </span>
      </label>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Back to Menu
        </button>
        <button
          type="button"
          disabled={basket.lines.length === 0 || !acknowledged}
          onClick={validateAndContinue}
          className="btn-shine bg-gradient-ember shadow-warm flex-1 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          Continue to Checkout
        </button>
      </div>
    </div>
  );
}
