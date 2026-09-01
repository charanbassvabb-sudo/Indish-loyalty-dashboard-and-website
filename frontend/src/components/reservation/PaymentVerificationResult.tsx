import { motion } from "framer-motion";
import { CheckCircle2, Clock4, AlertTriangle, XCircle, Copy as CopyIcon } from "lucide-react";

/**
 * Only the fields this component actually reads — deliberately not imported
 * from ReservationPaymentStep's PaymentUploadResult, so TakeawayPaymentStep's
 * result type (which has an `orderStatus` instead of `reservationStatus`)
 * can be passed here too without an unrelated field forcing a mismatch.
 * Both result types are structurally compatible with this one.
 */
export interface PaymentVerificationData {
  status: "AUTO_VERIFIED" | "REQUIRES_REVIEW" | "PAYMENT_FAILED" | "DUPLICATE" | "PROCESSING";
  expected: { amount: number; recipient: string };
  extracted: {
    amount: number | null;
    transactionId: string | null;
    sender: string | null;
    recipient: string | null;
    date: string | null;
    time: string | null;
    status: string;
  };
  matches: {
    amount: boolean | null;
    recipient: boolean | null;
    status: boolean | null;
    recency: boolean | null;
    notDuplicate: boolean | null;
  };
}

const STATUS_META: Record<
  PaymentVerificationData["status"],
  { icon: typeof CheckCircle2; label: string; tone: string; message: string }
> = {
  AUTO_VERIFIED: {
    icon: CheckCircle2,
    label: "Payment Verified",
    tone: "border-primary/40 bg-primary/10 text-primary",
    message: "Everything matched — your table is confirmed.",
  },
  REQUIRES_REVIEW: {
    icon: Clock4,
    label: "Requires Review",
    tone: "border-accent/40 bg-accent/10 text-accent",
    message: "We couldn't automatically confirm every detail, so a staff member is checking this by hand. You'll hear back shortly — no need to re-upload unless asked.",
  },
  PAYMENT_FAILED: {
    icon: XCircle,
    label: "Payment Failed",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    message: "This screenshot shows the transaction wasn't successful. Please try again with a screenshot of a completed payment.",
  },
  DUPLICATE: {
    icon: AlertTriangle,
    label: "Transaction Already Used",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    message: "This transaction has already been used to confirm a different booking. If you believe this is a mistake, please contact us.",
  },
  PROCESSING: {
    icon: Clock4,
    label: "Processing",
    tone: "border-border bg-card text-muted-foreground",
    message: "Checking your screenshot...",
  },
};

function MatchRow({ label, expected, detected, match }: { label: string; expected: string; detected: string; match: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium text-foreground">
        <span className="text-xs text-muted-foreground">{expected !== detected ? `${expected} → ` : ""}</span>
        {detected}
        {match === true && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
        {match === false && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
        {match === null && <span className="text-xs text-muted-foreground">(unclear)</span>}
      </span>
    </div>
  );
}

export function PaymentVerificationResult({ result, internalPaymentId }: { result: PaymentVerificationData; internalPaymentId: string }) {
  const meta = STATUS_META[result.status];

  function copyId() {
    navigator.clipboard.writeText(internalPaymentId).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-warm flex flex-col gap-4 p-5"
    >
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${meta.tone}`}>
        <meta.icon className="h-6 w-6 shrink-0" />
        <div>
          <p className="font-display text-lg">{meta.label}</p>
          <p className="text-xs opacity-90">{meta.message}</p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What we found in your screenshot</p>
        <MatchRow
          label="Amount"
          expected={`ZMW ${result.expected.amount}`}
          detected={result.extracted.amount !== null ? `ZMW ${result.extracted.amount}` : "Not detected"}
          match={result.matches.amount}
        />
        <MatchRow
          label="Recipient"
          expected={result.expected.recipient}
          detected={result.extracted.recipient ?? "Not detected"}
          match={result.matches.recipient}
        />
        <MatchRow
          label="Transaction status"
          expected="Successful"
          detected={result.extracted.status === "unknown" ? "Not detected" : result.extracted.status}
          match={result.matches.status}
        />
        <MatchRow
          label="Transaction ID"
          expected="Detected"
          detected={result.extracted.transactionId ?? "Not detected"}
          match={result.extracted.transactionId ? true : null}
        />
        <MatchRow
          label="Date/time"
          expected="Recent"
          detected={result.extracted.date ? `${result.extracted.date} ${result.extracted.time ?? ""}`.trim() : "Not detected"}
          match={result.matches.recency}
        />
      </div>

      <button
        type="button"
        onClick={copyId}
        className="flex items-center justify-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
      >
        <CopyIcon className="h-3.5 w-3.5" />
        Payment ref: {internalPaymentId}
      </button>
    </motion.div>
  );
}
