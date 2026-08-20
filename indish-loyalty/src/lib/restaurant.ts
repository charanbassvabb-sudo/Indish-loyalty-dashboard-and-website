// Base URL of the separate restaurant reservations app (indish-restaurant-project-updated).
// Defaults to its local dev port; override in .env for staging/production.
const RESTAURANT_ADMIN_URL = import.meta.env.VITE_RESTAURANT_ADMIN_URL ?? "http://localhost:5173";

/** Deep-links to the restaurant admin's Reservations tab, pre-filled with a phone number. */
export function reservationsSearchUrl(phone: string): string {
  const params = new URLSearchParams({ tab: "reservations", search: phone });
  return `${RESTAURANT_ADMIN_URL}/admin?${params}`;
}

export { RESTAURANT_ADMIN_URL };
