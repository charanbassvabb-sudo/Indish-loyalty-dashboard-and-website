/**
 * Fixed, permanent recurring closures per branch — not a staff-set
 * DailyAvailability override, computed here so nobody has to remember to add
 * one every month. Used by both the reservation validator (hard block on
 * booking) and the public availability endpoint (so the UI shows "Closed"
 * before the customer even tries to submit). Mirrored client-side in
 * frontend/src/data/reservation.ts (isRecurringlyClosed) for immediate
 * feedback in the time-slot picker — that copy is UX-only; this one is what
 * actually enforces it.
 *
 * weekday: 0=Sunday..6=Saturday. occurrences: which numbered occurrence(s)
 * of that weekday in the month count as closed (1st, 2nd, 3rd...).
 */
const RECURRING_CLOSURES: Record<string, { weekday: number; occurrences: number[]; note: string }> = {
  LUSAKA: { weekday: 1, occurrences: [2, 3], note: "Closed — 2nd & 3rd Monday of the month" },
  KITWE: { weekday: 2, occurrences: [2], note: "Closed — 2nd Tuesday of the month" },
};

export function isRecurringlyClosed(date: string, branch: string): boolean {
  const rule = RECURRING_CLOSURES[branch];
  if (!rule || !date) return false;
  const d = new Date(`${date}T12:00:00Z`); // midday UTC — immune to timezone drift
  if (d.getUTCDay() !== rule.weekday) return false;
  const occurrence = Math.ceil(d.getUTCDate() / 7);
  return rule.occurrences.includes(occurrence);
}

export function getRecurringClosureNote(branch: string): string {
  return RECURRING_CLOSURES[branch]?.note ?? "Closed";
}
