import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, User, Phone, Mail, Calendar, Clock, Wallet, CreditCard, Check, Tag } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { loyaltySearchUrl } from "@/lib/loyalty";
import type { AdminTakeawayOrder, TakeawayOrderStatus, AdminDiscount, DiscountType } from "@/types/admin";
import { TAKEAWAY_STATUS_LABEL, SPICE_LEVEL_LABEL, PAYMENT_STATUS_LABEL } from "@/types/admin";
import { useToast } from "@/context/ToastContext";

const ALL_STATUSES: TakeawayOrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const STATUS_DOT: Record<TakeawayOrderStatus, string> = {
  PENDING_PAYMENT: "bg-accent",
  CONFIRMED: "bg-primary",
  PREPARING: "bg-accent",
  READY_FOR_PICKUP: "bg-emerald-400",
  COMPLETED: "bg-gold",
  CANCELLED: "bg-destructive",
  NO_SHOW: "bg-muted-foreground",
};

export function TakeawayOrderDrawer({
  order,
  onClose,
  onSaved,
}: {
  order: AdminTakeawayOrder | null;
  onClose: () => void;
  onSaved: (updated: AdminTakeawayOrder) => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TakeawayOrderStatus | undefined>(order?.status);
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Local mirrors of discount/totalAmount so applying/editing/removing a
  // discount updates this drawer immediately without needing it to be
  // closed and reopened — order (the prop) itself never mutates in place.
  const [discount, setDiscount] = useState<AdminDiscount | null>(order?.discount ?? null);
  const [totalAmount, setTotalAmount] = useState(order?.totalAmount ?? "0");
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("FIXED");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [discountBusy, setDiscountBusy] = useState(false);

  function startEditDiscount() {
    if (!discount) return;
    setDiscountType(discount.type);
    setDiscountValue(discount.value);
    setDiscountReason(discount.reason ?? "");
    setEditingDiscount(true);
  }

  async function submitDiscount() {
    if (!order) return;
    const value = Number(discountValue);
    if (!value || value <= 0) {
      toast({ title: "Enter a discount value", description: "Value must be greater than 0.", variant: "error" });
      return;
    }
    setDiscountBusy(true);
    try {
      const body = { type: discountType, value, reason: discountReason.trim() || undefined };
      const res =
        discount && editingDiscount
          ? await api.patch<{ order: AdminTakeawayOrder }>(`/admin/takeaway-orders/${order.id}/discount`, body)
          : await api.post<{ order: AdminTakeawayOrder }>(`/admin/takeaway-orders/${order.id}/discount`, body);
      setDiscount(res.order.discount);
      setTotalAmount(res.order.totalAmount);
      setEditingDiscount(false);
      setDiscountValue("");
      setDiscountReason("");
      onSaved(res.order);
      toast({ title: discount ? "Discount updated" : "Discount applied", description: order.reference, variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't save discount",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDiscountBusy(false);
    }
  }

  async function removeDiscountHandler() {
    if (!order) return;
    setDiscountBusy(true);
    try {
      const res = await api.delete<{ order: AdminTakeawayOrder }>(`/admin/takeaway-orders/${order.id}/discount`);
      setDiscount(null);
      setTotalAmount(res.order.totalAmount);
      onSaved(res.order);
      toast({ title: "Discount removed", description: order.reference, variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't remove discount",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDiscountBusy(false);
    }
  }

  async function save() {
    if (!order) return;
    setSaving(true);
    try {
      const res = await api.patch<{ order: AdminTakeawayOrder }>(`/admin/takeaway-orders/${order.id}`, {
        status,
        notes,
      });
      onSaved(res.order);
      toast({ title: "Order updated", description: order.reference, variant: "success" });
      setJustSaved(true);
      setSaving(false);
      window.setTimeout(() => {
        setJustSaved(false);
        onClose();
      }, 650);
      return;
    } catch (err) {
      toast({
        title: "Couldn't save changes",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    }
    setSaving(false);
  }

  const latestAttempt = order?.paymentAttempts[0];

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-lift"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-2xl text-gradient-ember">{order.reference}</h2>
              <motion.button
                onClick={onClose}
                aria-label="Close"
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            <p className="mb-6 text-xs uppercase tracking-wide text-muted-foreground">{order.branch.name}</p>

            <dl className="mb-5 space-y-1 text-sm">
              <Row icon={User} label="Customer" value={order.customerName} />
              <Row icon={Phone} label="Phone" value={order.phone} />
              {order.email && <Row icon={Mail} label="Email" value={order.email} />}
              <Row icon={Calendar} label="Pickup Date" value={order.pickupDate.slice(0, 10)} />
              <Row icon={Clock} label="Pickup Time" value={order.pickupTime} />
              <Row icon={Wallet} label="Total" value={`ZMW ${totalAmount}`} />
              {latestAttempt && (
                <Row
                  icon={CreditCard}
                  label="Payment"
                  value={`${latestAttempt.provider} · ${
                    latestAttempt.extractedTransactionId ?? "no transaction ID read"
                  } · ${PAYMENT_STATUS_LABEL[latestAttempt.status]}`}
                />
              )}
            </dl>

            <a
              href={loyaltySearchUrl(order.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View loyalty profile
            </a>

            <div className="card-warm mb-6 flex flex-col divide-y divide-border/60 p-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.quantity} × {item.nameSnapshot}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.priceVariantLabel ? `${item.priceVariantLabel} · ` : ""}
                      {item.spiceLevel ? `${SPICE_LEVEL_LABEL[item.spiceLevel]} spice` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">ZMW {item.lineTotal}</span>
                </div>
              ))}
            </div>

            {order.status === "PENDING_PAYMENT" && (
              <div className="card-warm mb-6 flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    Discount
                  </span>
                  {discount && !editingDiscount && (
                    <div className="flex gap-3">
                      <button type="button" onClick={startEditDiscount} className="text-xs font-semibold text-primary hover:underline">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={removeDiscountHandler}
                        disabled={discountBusy}
                        className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {discount && !editingDiscount ? (
                  <div className="text-sm">
                    <p className="text-foreground">
                      {discount.type === "PERCENTAGE" ? `${discount.value}% off` : `ZMW ${discount.value} off`}
                      {discount.reason ? ` — ${discount.reason}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Original ZMW {discount.originalAmount} → Discount ZMW {discount.discountAmount} → Final ZMW{" "}
                      {discount.finalAmount}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {(["FIXED", "PERCENTAGE"] as DiscountType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDiscountType(t)}
                          className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            discountType === t
                              ? "border-primary bg-secondary text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {t === "FIXED" ? "Fixed (ZMW)" : "Percentage (%)"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "FIXED" ? "e.g. 50" : "e.g. 10"}
                      className="field"
                    />
                    <input
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="field"
                    />
                    {Number(discountValue) > 0 &&
                      (() => {
                        const subtotal = Number(order.subtotalAmount);
                        const raw =
                          discountType === "PERCENTAGE"
                            ? (subtotal * Number(discountValue)) / 100
                            : Number(discountValue);
                        const previewDiscount = Math.min(subtotal, raw);
                        const previewFinal = Math.max(0, subtotal - previewDiscount);
                        return (
                          <p className="text-xs text-muted-foreground">
                            Original ZMW {subtotal.toFixed(2)} → Discount ZMW {previewDiscount.toFixed(2)} → Final ZMW{" "}
                            {previewFinal.toFixed(2)}
                          </p>
                        );
                      })()}
                    <div className="flex gap-2">
                      {editingDiscount && (
                        <button
                          type="button"
                          onClick={() => setEditingDiscount(false)}
                          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={submitDiscount}
                        disabled={discountBusy || !discountValue}
                        className="flex-1 rounded-full bg-gradient-ember px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-50"
                      >
                        {discountBusy ? "Saving..." : discount ? "Update Discount" : "Apply Discount"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mb-6">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      status === s
                        ? "border-primary/50 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {status === s && (
                      <motion.span
                        layoutId="takeaway-status-pill"
                        className="absolute inset-0 rounded-full bg-secondary"
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                    <span className={`relative z-10 h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
                    <span className="relative z-10">{TAKEAWAY_STATUS_LABEL[s]}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-6 flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Internal notes
              </span>
              <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="field resize-none" />
            </label>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:border-primary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || justSaved}
                className="bg-gradient-ember shadow-warm relative flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform disabled:opacity-90"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {justSaved ? (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      Saved
                    </motion.span>
                  ) : (
                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {saving ? "Saving..." : "Save Changes"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border/60 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="ml-auto truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
