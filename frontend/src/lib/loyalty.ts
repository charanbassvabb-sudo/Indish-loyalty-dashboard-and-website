// Base URL of the separate Indish Loyalty app (../indish-loyalty).
// Defaults to its local dev port (vite dev binds :8080 there, not the :3000
// its own README describes); override in .env for staging/production.
const LOYALTY_APP_URL = import.meta.env.VITE_LOYALTY_APP_URL ?? "http://localhost:8080";

/** Deep-links to the loyalty app's Quick Search, pre-filled with a phone number. */
export function loyaltySearchUrl(phone: string): string {
  return `${LOYALTY_APP_URL}/search?q=${encodeURIComponent(phone)}`;
}

export { LOYALTY_APP_URL };
