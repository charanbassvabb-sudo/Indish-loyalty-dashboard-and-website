import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock4, Calendar, Clock, Users, Sofa, Wallet } from "lucide-react";
import type { Branch } from "@/types";
import { burstConfetti } from "@/lib/confetti";

export interface ReservationConfirmation {
  reference: string;
  date: string;
  time: string;
  guests: number;
  seating: string;
  depositAmount: number;
  /** PENDING_PAYMENT here specifically means the screenshot is in for staff
   * review (see ReservationPaymentStep.tsx — PAYMENT_FAILED/DUPLICATE keep
   * the customer on the payment step to retry instead of reaching this
   * step at all). CONFIRMED means the system auto-verified it. */
  status: "PENDING_PAYMENT" | "CONFIRMED";
  /** Our own internal payment reference (e.g. PAY-2026-83921) — set once a
   * screenshot has actually been uploaded and attempted. */
  internalPaymentId?: string;
}

export function ReservationConfirmationStep({
  branch,
  confirmation,
}: {
  branch: Branch;
  confirmation: ReservationConfirmation;
}) {
  const confirmed = confirmation.status === "CONFIRMED";

  const rows = [
    { icon: Calendar, label: "Date", value: confirmation.date },
    { icon: Clock, label: "Time", value: confirmation.time },
    { icon: Users, label: "Guests", value: String(confirmation.guests) },
    { icon: Sofa, label: "Seating", value: formatSeating(confirmation.seating) },
    { icon: Wallet, label: confirmed ? "Deposit paid" : "Deposit submitted", value: `ZMW ${confirmation.depositAmount}` },
  ];

  // Only celebrate a genuine confirmation — bursting confetti the moment a
  // typed transaction ID hits the database would celebrate something that
  // hasn't actually been checked yet.
  useEffect(() => {
    if (confirmed) burstConfetti({ originY: 0.3 });
  }, [confirmed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="card-warm flex flex-col items-center gap-6 p-10 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
      >
        {confirmed ? (
          <CheckCircle2 className="h-16 w-16 text-primary" />
        ) : (
          <Clock4 className="h-16 w-16 text-accent" />
        )}
      </motion.div>

      <div>
        <p className="eyebrow">{confirmed ? "Booking Confirmed" : "Booking Received"}</p>
        <h2 className="mt-2 font-display text-3xl text-foreground md:text-4xl">
          {confirmation.reference}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{branch.name}</p>
        {confirmation.internalPaymentId && (
          <p className="mt-1 text-xs text-muted-foreground">Payment ref: {confirmation.internalPaymentId}</p>
        )}
      </div>

      <div className="grid w-full gap-3 text-left sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
            <row.icon className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {row.label}
              </p>
              <p className="text-sm font-medium text-foreground">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="max-w-sm text-xs text-muted-foreground">
        {confirmed
          ? "A confirmation has been sent via SMS. Your deposit will be deducted from the final bill on the day."
          : "We're verifying your deposit against the payment now — you'll get a WhatsApp message the moment your table is confirmed, usually well before your reservation time."}
      </p>

      <Link
        to={`/${branch.id}`}
        className="bg-gradient-ember shadow-warm rounded-full px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
      >
        Back to {branch.name}
      </Link>
    </motion.div>
  );
}

function formatSeating(seating: string) {
  if (seating === "OUTDOOR") return "Outdoor patio";
  if (seating === "INDOOR") return "Indoor";
  return "No preference";
}
