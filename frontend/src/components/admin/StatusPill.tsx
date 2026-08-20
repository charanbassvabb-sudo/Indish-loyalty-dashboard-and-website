import type { ReservationStatus } from "@/types/admin";
import { STATUS_LABEL } from "@/types/admin";

const DOT_STYLE: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "bg-accent",
  CONFIRMED: "bg-primary",
  CANCELLED: "bg-destructive",
  COMPLETED: "bg-emerald-400",
  NO_SHOW: "bg-muted-foreground",
};

const PILL_STYLE: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "bg-accent/15 text-accent border border-accent/30",
  CONFIRMED: "bg-secondary text-secondary-foreground border border-primary/40",
  CANCELLED: "bg-destructive/15 text-destructive border border-destructive/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  NO_SHOW: "bg-border/60 text-muted-foreground border border-border",
};

/** A colored pill with a status dot — the dot pulses while payment is pending. */
export function StatusPill({ status, className = "" }: { status: ReservationStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${PILL_STYLE[status]} ${className}`}
    >
      <span className={`relative flex h-1.5 w-1.5 rounded-full ${DOT_STYLE[status]}`}>
        {status === "PENDING_PAYMENT" && (
          <span className={`absolute inset-0 animate-ping rounded-full ${DOT_STYLE[status]} opacity-75`} />
        )}
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}
