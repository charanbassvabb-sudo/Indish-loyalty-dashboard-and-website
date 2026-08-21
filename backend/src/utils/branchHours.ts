/**
 * Lusaka is closed on the 2nd and 3rd Monday of every month — a fixed,
 * permanent recurring closure, computed here rather than tracked as one-off
 * DailyAvailability rows so nobody has to remember to add them every month.
 * Used by both the reservation validator (hard block on booking) and the
 * public availability endpoint (so the UI shows "Closed" before the
 * customer even tries to submit). Mirrored client-side in
 * frontend/src/data/reservation.ts (isLusakaRecurringClosure) for immediate
 * feedback in the time-slot picker — that copy is UX-only; this one is what
 * actually enforces it.
 */
export function isLusakaRecurringClosure(date: string, branch: string): boolean {
  if (branch !== "LUSAKA" || !date) return false;
  const d = new Date(`${date}T12:00:00Z`); // midday UTC — immune to timezone drift
  if (d.getUTCDay() !== 1) return false; // 1 = Monday
  const occurrence = Math.ceil(d.getUTCDate() / 7);
  return occurrence === 2 || occurrence === 3;
}

export const LUSAKA_CLOSURE_NOTE = "Closed — 2nd & 3rd Monday of the month";
