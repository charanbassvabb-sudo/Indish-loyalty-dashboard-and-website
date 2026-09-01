import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, XCircle, RotateCcw, User, Phone, Mail, Calendar, Wallet, ExternalLink, CheckCircle2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { loyaltySearchUrl } from "@/lib/loyalty";
import { formatReservationDate } from "@/lib/utils";
import type { PaymentAttemptListItem } from "@/types/admin";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_STYLE, paymentAttemptOrderInfo } from "@/types/admin";
import { useToast } from "@/context/ToastContext";

function MatchField({ label, expected, detected, match }: { label: string; expected?: string; detected: string | null; match: boolean | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium text-foreground">
        {expected && <span className="text-xs text-muted-foreground">expected {expected} →</span>}
        {detected ?? "not detected"}
        {match === true && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
        {match === false && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
      </span>
    </div>
  );
}

export function PaymentAttemptDrawer({
  attempt,
  onClose,
  onActed,
}: {
  attempt: PaymentAttemptListItem | null;
  onClose: () => void;
  onActed: () => void;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState<"approve" | "reject" | "request_new_screenshot" | null>(null);
  const info = attempt ? paymentAttemptOrderInfo(attempt) : null;

  async function act(action: "approve" | "reject" | "request_new_screenshot") {
    if (!attempt?.id || !info) return;
    setActing(action);
    try {
      await api.patch(`/admin/payment-attempts/${attempt.id}`, { action, notes: notes.trim() || undefined });
      toast({
        title:
          action === "approve" ? "Payment approved" : action === "reject" ? "Payment rejected" : "Requested a new screenshot",
        description: info.reference,
        variant: action === "reject" ? "error" : "success",
      });
      onActed();
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't update payment",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setActing(null);
    }
  }

  return (
    <AnimatePresence>
      {attempt && info && (
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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-border bg-card p-6 shadow-lift"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-2xl text-gradient-ember">{info.reference}</h2>
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
            <div className="mb-6 flex items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{info.branchName}</p>
              {info.kind === "TAKEAWAY" && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-secondary-foreground">
                  Takeaway
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${PAYMENT_STATUS_STYLE[attempt.paymentStatus]}`}
              >
                {PAYMENT_STATUS_LABEL[attempt.paymentStatus]}
              </span>
            </div>

            <dl className="mb-5 space-y-1 text-sm">
              <Row icon={User} label="Customer" value={info.customerName} />
              <Row icon={Phone} label="Phone" value={info.phone} />
              {info.email && <Row icon={Mail} label="Email" value={info.email} />}
              <Row
                icon={Calendar}
                label={info.kind === "TAKEAWAY" ? "Pickup" : "Date"}
                value={info.kind === "RESERVATION" ? `${formatReservationDate(attempt.reservation!.date)} · ${attempt.reservation!.time}` : info.dateLabel}
              />
              <Row icon={Wallet} label={info.kind === "TAKEAWAY" ? "Total" : "Deposit"} value={info.amountLabel} />
            </dl>

            <a
              href={loyaltySearchUrl(info.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View loyalty profile
            </a>

            {attempt.id === null ? (
              <p className="rounded-xl border border-border bg-background/50 p-4 text-sm text-muted-foreground">
                No screenshot has been uploaded for this booking yet — there's nothing to review here until the
                customer pays and uploads their confirmation.
              </p>
            ) : (
              <>
                <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-background/50">
                  <img
                    src={`/api/admin/payment-attempts/${attempt.id}/screenshot`}
                    alt="Uploaded payment screenshot"
                    className="max-h-96 w-full object-contain"
                  />
                </div>

                <div className="card-warm mb-5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What we found vs. what was expected
                  </p>
                  <MatchField label="Amount" expected={`ZMW ${attempt.expectedAmount ?? info.amountLabel.replace("ZMW ", "")}`} detected={attempt.extracted?.amount ? `ZMW ${attempt.extracted.amount}` : null} match={attempt.matches?.amount} />
                  <MatchField label="Recipient" expected={attempt.expectedRecipient} detected={attempt.extracted?.recipient ?? null} match={attempt.matches?.recipient} />
                  <MatchField label="Sender" detected={attempt.extracted?.sender ?? null} match={undefined} />
                  <MatchField label="Status" expected="successful" detected={attempt.extracted?.status ?? null} match={attempt.matches?.status} />
                  <MatchField label="Transaction ID" detected={attempt.extracted?.transactionId ?? null} match={attempt.extracted?.transactionId ? true : null} />
                  <MatchField label="Date/time" detected={attempt.extracted?.date ? `${attempt.extracted.date} ${attempt.extracted.time ?? ""}`.trim() : null} match={attempt.matches?.recency} />
                  {attempt.confidenceScore !== null && attempt.confidenceScore !== undefined && (
                    <p className="mt-2 text-xs text-muted-foreground">Confidence score: {attempt.confidenceScore}/100</p>
                  )}
                  {attempt.internalPaymentId && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Payment ref: {attempt.internalPaymentId}</p>
                  )}
                </div>

                {attempt.reviewNotes && (
                  <p className="mb-5 rounded-xl border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                    Previous note: {attempt.reviewNotes}
                  </p>
                )}

                <label className="mb-5 flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Note (optional — sent to the customer when requesting a new screenshot)
                  </span>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="field resize-none"
                    placeholder="e.g. The amount doesn't match — please double check and re-upload."
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => act("approve")}
                    disabled={acting !== null}
                    className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    {acting === "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => act("request_new_screenshot")}
                    disabled={acting !== null}
                    className="flex flex-col items-center gap-1 rounded-xl border border-accent/40 bg-accent/10 px-3 py-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {acting === "request_new_screenshot" ? "Sending..." : "Request New"}
                  </button>
                  <button
                    onClick={() => act("reject")}
                    disabled={acting !== null}
                    className="flex flex-col items-center gap-1 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    {acting === "reject" ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </>
            )}
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
