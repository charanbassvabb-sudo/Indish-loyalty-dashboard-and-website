import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MenuItem } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A handful of menu items print with more than one price on the physical
 * menu — "Veg. - K200 | Chicken - K250", "Half - K200 / Full - K350",
 * "Dry - K100 / Gravy - K150" — via item.priceLabel/priceVariants. Every
 * other item just has the one price, so this collapses both shapes into
 * whatever line the card/modal should show.
 */
export function formatMenuPrice(item: Pick<MenuItem, "price" | "priceLabel" | "priceVariants">): string {
  if (!item.priceVariants?.length) return `ZMW ${item.price}`;
  const parts = [
    `${item.priceLabel ? `${item.priceLabel} ` : ""}ZMW ${item.price}`,
    ...item.priceVariants.map((v) => `${v.label} ZMW ${v.price}`),
  ];
  return parts.join(" · ");
}

/**
 * Prisma's `@db.Date` fields serialize to JSON as a full ISO datetime
 * string (e.g. "2026-08-14T00:00:00.000Z") even though only the date part
 * means anything — parsing it back with `new Date()` and formatting
 * locally would also risk shifting the day near midnight in timezones
 * behind UTC. Slicing the date portion straight out of the string sidesteps
 * both problems.
 */
export function formatReservationDate(isoDate: string, { withWeekday = true }: { withWeekday?: boolean } = {}): string {
  const datePart = isoDate.slice(0, 10); // "2026-08-14"
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-ZM", {
    timeZone: "UTC",
    ...(withWeekday && { weekday: "short" }),
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
