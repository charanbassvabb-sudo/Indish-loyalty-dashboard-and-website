import { Ban } from "lucide-react";

/**
 * The spec's explicit "TAKEAWAY ONLY — NO DELIVERY" notice, made a visible
 * fixture of the flow rather than a one-line disclaimer: a compact strip on
 * every step (`size="sm"`, the default), plus a bolder standalone card right
 * above the pickup-time picker on the review step (`size="lg"`, gated behind
 * a required acknowledgement checkbox there — see TakeawayReviewOrderStep).
 */
export function TakeawayOnlyBanner({ size = "sm" }: { size?: "sm" | "lg" }) {
  if (size === "lg") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border-2 border-accent/50 bg-accent/10 p-4">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-accent">Takeaway Only — No Delivery</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This order is for collection in person only — we don't offer delivery. Please only continue if you're
            able to pick it up yourself at the selected branch.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto mt-4 flex max-w-fit items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-accent">
      <Ban className="h-3.5 w-3.5" />
      Takeaway Only — No Delivery
    </div>
  );
}
