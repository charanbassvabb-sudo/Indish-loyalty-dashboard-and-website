import type { BranchId } from "@/types";

export type SpiceLevel = "MILD" | "MEDIUM" | "HOT";

export const SPICE_LEVELS: { id: SpiceLevel; label: string }[] = [
  { id: "MILD", label: "Mild" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HOT", label: "Hot" },
];

// Mirrors MIN_PICKUP_LEAD_MINUTES / MAX_PICKUP_ADVANCE_HOURS in
// backend/src/validators/takeaway.validator.ts — kept in lockstep manually,
// the same way MAX_ADVANCE_HOURS in data/reservation.ts mirrors the
// reservation booking window. This copy just gives immediate feedback in the
// pickup picker instead of waiting for a rejected submit.
export const MIN_PICKUP_LEAD_MINUTES = 30;
// Same rolling 24h booking window as reservations — nothing further out,
// like a flight search only letting you pick a date it actually flies.
export const MAX_PICKUP_ADVANCE_HOURS = 24;

// Structured daily opening hours per branch — Mon–Thu and Fri–Sun differ, per
// the same client-confirmed hours shown as a free-text display string in
// data/branches.ts. Mirrors BRANCH_OPERATING_HOURS in
// backend/src/utils/branchHours.ts, which is what actually enforces this —
// this copy just gives immediate feedback in the pickup time picker instead
// of waiting for a rejected submit. Keep both in lockstep manually if the
// client ever changes hours.
const BRANCH_OPERATING_HOURS: Record<
  BranchId,
  { monThu: { open: string; close: string }; friSun: { open: string; close: string } }
> = {
  lusaka: { monThu: { open: "11:30", close: "22:00" }, friSun: { open: "11:00", close: "23:00" } },
  kitwe: { monThu: { open: "11:00", close: "22:00" }, friSun: { open: "11:00", close: "22:30" } },
};

// Pickup must stop at least this long before closing time so the kitchen
// isn't rushing the last order out the door right as the branch closes.
export const PICKUP_CLOSING_BUFFER_MINUTES = 30;

function getOperatingHours(date: string, branchId: BranchId): { open: string; close: string } | null {
  const hours = BRANCH_OPERATING_HOURS[branchId];
  if (!hours || !date) return null;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // midday UTC — immune to timezone drift
  return weekday >= 1 && weekday <= 4 ? hours.monThu : hours.friSun;
}

function subtractMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m - minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The bookable pickup window for a date — open time through closing-minus-buffer. */
export function getPickupWindow(date: string, branchId: BranchId): { open: string; close: string } | null {
  const hours = getOperatingHours(date, branchId);
  if (!hours) return null;
  return { open: hours.open, close: subtractMinutes(hours.close, PICKUP_CLOSING_BUFFER_MINUTES) };
}

export function getBranchHoursNote(date: string, branchId: BranchId): string {
  const window = getPickupWindow(date, branchId);
  if (!window) return "Please select a pickup date to see available times";
  return `Pickup is available between ${window.open} and ${window.close}`;
}

// Same +02:00 Africa/Lusaka wall-clock handling as getSlotAvailability in
// data/reservation.ts — pickup times are always restaurant-local, not the
// visitor's own browser timezone.
export function isPickupTimeBookable(date: string, time: string, branchId: BranchId): boolean {
  if (!date || !time) return false;
  const target = new Date(`${date}T${time}:00+02:00`);
  const now = new Date();
  const minTime = new Date(now.getTime() + MIN_PICKUP_LEAD_MINUTES * 60 * 1000);
  const maxTime = new Date(now.getTime() + MAX_PICKUP_ADVANCE_HOURS * 60 * 60 * 1000);
  if (target < minTime || target > maxTime) return false;
  const window = getPickupWindow(date, branchId);
  if (!window) return true;
  return time >= window.open && time <= window.close;
}
