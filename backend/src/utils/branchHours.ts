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

/**
 * Structured daily opening hours per branch — Mon–Thu and Fri–Sun differ, per
 * the client-confirmed hours also shown as a free-text display string in
 * frontend/src/data/branches.ts. Mirrored client-side in
 * frontend/src/data/takeaway.ts (BRANCH_OPERATING_HOURS) for immediate
 * feedback in the pickup time picker — this copy is what actually enforces
 * it. Keep both in lockstep manually if the client ever changes hours.
 */
const BRANCH_OPERATING_HOURS: Record<
  string,
  { monThu: { open: string; close: string }; friSun: { open: string; close: string } }
> = {
  LUSAKA: { monThu: { open: "11:30", close: "22:00" }, friSun: { open: "11:00", close: "23:00" } },
  KITWE: { monThu: { open: "11:00", close: "22:00" }, friSun: { open: "11:00", close: "22:30" } },
};

// Pickup must stop at least this long before closing time so the kitchen
// isn't rushing the last order out the door right as the branch closes.
export const PICKUP_CLOSING_BUFFER_MINUTES = 30;

function getOperatingHours(date: string, branch: string): { open: string; close: string } | null {
  const hours = BRANCH_OPERATING_HOURS[branch];
  if (!hours || !date) return null;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // midday UTC — immune to timezone drift; 0=Sun..6=Sat
  return weekday >= 1 && weekday <= 4 ? hours.monThu : hours.friSun;
}

function subtractMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = ((h * 60 + m - minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The last bookable pickup time on the given date — closing time minus the buffer. */
export function getLatestPickupTime(date: string, branch: string): string | null {
  const hours = getOperatingHours(date, branch);
  if (!hours) return null;
  return subtractMinutes(hours.close, PICKUP_CLOSING_BUFFER_MINUTES);
}

/**
 * Whether `time` falls within the branch's opening hours on `date`, ending
 * PICKUP_CLOSING_BUFFER_MINUTES before actual close. Unknown branches are
 * not blocked here — branchCodeSchema already rejects those upstream.
 */
export function isWithinBranchOperatingHours(date: string, time: string, branch: string): boolean {
  const hours = getOperatingHours(date, branch);
  if (!hours) return true;
  const latestPickup = subtractMinutes(hours.close, PICKUP_CLOSING_BUFFER_MINUTES);
  return time >= hours.open && time <= latestPickup;
}

export function getBranchHoursNote(date: string, branch: string): string {
  const hours = getOperatingHours(date, branch);
  if (!hours) return "Please check our opening hours";
  const latestPickup = subtractMinutes(hours.close, PICKUP_CLOSING_BUFFER_MINUTES);
  return `Pickup is available between ${hours.open} and ${latestPickup}`;
}
