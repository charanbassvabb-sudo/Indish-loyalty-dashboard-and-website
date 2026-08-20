import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, User, Phone, Mail, Users, Calendar, Wallet, CreditCard, Check } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { loyaltySearchUrl } from "@/lib/loyalty";
import { formatReservationDate } from "@/lib/utils";
import type { AdminReservation, ReservationStatus } from "@/types/admin";
import { STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/types/admin";
import { useToast } from "@/context/ToastContext";

const ALL_STATUSES: ReservationStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];

const STATUS_DOT: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "bg-accent",
  CONFIRMED: "bg-primary",
  CANCELLED: "bg-destructive",
  COMPLETED: "bg-emerald-400",
  NO_SHOW: "bg-muted-foreground",
};

export function ReservationEditDrawer({
  reservation,
  onClose,
  onSaved,
}: {
  reservation: AdminReservation | null;
  onClose: () => void;
  onSaved: (updated: AdminReservation) => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ReservationStatus | undefined>(reservation?.status);
  const [notes, setNotes] = useState(reservation?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function save() {
    if (!reservation) return;
    setSaving(true);
    try {
      const res = await api.patch<{ reservation: AdminReservation }>(
        `/admin/reservations/${reservation.id}`,
        { status, notes },
      );
      onSaved(res.reservation);
      toast({ title: "Reservation updated", description: reservation.reference, variant: "success" });
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

  return (
    <AnimatePresence>
      {reservation && (
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
              <h2 className="font-display text-2xl text-gradient-ember">{reservation.reference}</h2>
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
            <p className="mb-6 text-xs uppercase tracking-wide text-muted-foreground">{reservation.branch.name}</p>

            <dl className="mb-5 space-y-1 text-sm">
              <Row icon={User} label="Customer" value={reservation.customerName} />
              <Row icon={Phone} label="Phone" value={reservation.phone} />
              <Row icon={Mail} label="Email" value={reservation.email} />
              <Row icon={Users} label="Guests" value={String(reservation.guests)} />
              <Row icon={Calendar} label="Date" value={`${formatReservationDate(reservation.date)} · ${reservation.time}`} />
              <Row icon={Wallet} label="Deposit" value={`ZMW ${reservation.depositAmount}`} />
              {reservation.paymentAttempts[0] && (
                <Row
                  icon={CreditCard}
                  label="Payment"
                  value={`${reservation.paymentAttempts[0].provider} · ${
                    reservation.paymentAttempts[0].extractedTransactionId ?? "no transaction ID read"
                  } · ${PAYMENT_STATUS_LABEL[reservation.paymentAttempts[0].status]}`}
                />
              )}
            </dl>

            <a
              href={loyaltySearchUrl(reservation.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View loyalty profile
            </a>

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
                        layoutId="reservation-status-pill"
                        className="absolute inset-0 rounded-full bg-secondary"
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                    <span className={`relative z-10 h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
                    <span className="relative z-10">{STATUS_LABEL[s]}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-6 flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Internal notes
              </span>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="field resize-none"
              />
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
