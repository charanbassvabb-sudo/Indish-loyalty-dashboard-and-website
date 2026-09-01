import { useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import { useToast } from "@/context/ToastContext";
import type { BranchId } from "@/types";

export interface CreatedTakeawayOrder {
  id: number;
  reference: string;
  branch: "LUSAKA" | "KITWE";
  pickupDate: string;
  pickupTime: string;
  subtotalAmount: number;
  totalAmount: number;
  status: "PENDING_PAYMENT" | "CONFIRMED";
}

interface FormState {
  customerName: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyForm: FormState = { customerName: "", phone: "", email: "", notes: "" };

export function TakeawayCheckoutStep({
  branchId,
  pickupDate,
  pickupTime,
  onCreated,
  onBack,
}: {
  branchId: BranchId;
  pickupDate: string;
  pickupTime: string;
  onCreated: (order: CreatedTakeawayOrder) => void;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const basket = useBasket();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.customerName.trim().length < 2) next.customerName = "Name must be at least 2 characters";
    if (form.phone.replace(/\D/g, "").length < 9) next.phone = "Phone must have at least 9 digits";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post<CreatedTakeawayOrder>("/takeaway-orders", {
        branch: branchId.toUpperCase(),
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        pickupDate,
        pickupTime,
        acknowledgedNoDelivery: true,
        items: basket.lines.map((l) => ({
          menuItemId: Number(l.menuItemId),
          quantity: l.quantity,
          priceVariantLabel: l.priceVariantLabel ?? undefined,
          spiceLevel: l.spiceLevel ?? undefined,
        })),
      });
      onCreated(res);
    } catch (err) {
      toast({
        title: "Couldn't place your order",
        description:
          err instanceof ApiRequestError
            ? err.message
            : "Something went wrong. Please check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</span>
        <input
          value={form.customerName}
          onChange={(e) => update("customerName", e.target.value)}
          className="field"
          placeholder="Your name"
        />
        {errors.customerName && <span className="text-xs text-destructive">{errors.customerName}</span>}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</span>
        <input
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="field"
          placeholder="09XXXXXXXX"
        />
        {errors.phone && <span className="text-xs text-destructive">{errors.phone}</span>}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email (optional)</span>
        <input
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="field"
          placeholder="you@example.com"
        />
        {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="field resize-none"
          placeholder="Any special requests?"
        />
      </label>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-shine bg-gradient-ember shadow-warm flex-1 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
        >
          {submitting ? "Placing order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
