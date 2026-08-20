/** Format a Kwacha amount, e.g. formatK(1500) -> "K1,500" */
export function formatK(amount: number): string {
  return `K${Math.round(amount).toLocaleString()}`;
}

/** Format an ISO date string as "12 Jul 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole days remaining until an ISO date (never negative). */
export function daysRemaining(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
