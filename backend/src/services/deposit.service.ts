import { env } from "../config/env";

/**
 * Computes the required deposit in ZMW for a given guest count.
 *
 * This is intentionally the ONLY place deposit amounts are calculated.
 * The frontend may display an estimate, but the backend recomputes and
 * uses this value when creating the reservation and payment records —
 * the amount sent by the client is never trusted or persisted as-is.
 */
export function calculateDepositZMW(guests: number): number {
  if (!Number.isInteger(guests) || guests < 1 || guests > 40) {
    throw new Error("guests must be an integer between 1 and 40");
  }
  return guests * env.DEPOSIT_PER_GUEST_ZMW;
}
