import crypto from "crypto";

const BRANCH_PREFIX: Record<"LUSAKA" | "KITWE", string> = {
  LUSAKA: "LU",
  KITWE: "KI",
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

function randomSuffix(length = 5): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** Generates a booking reference like IND-LU-A3F9C or IND-KI-7QZXM. */
export function generateBookingReference(branch: "LUSAKA" | "KITWE"): string {
  return `IND-${BRANCH_PREFIX[branch]}-${randomSuffix()}`;
}

/**
 * Generates our own internal payment reference, e.g. PAY-2026-83921 — ties a
 * payment attempt back to a booking in OUR system. The customer never enters
 * this anywhere; Airtel/MTN's own USSD/app flow has no field for a merchant
 * reference, so this exists purely for us (support conversations, CSV
 * exports, admin search) — not as something checked against the screenshot.
 */
export function generateInternalPaymentId(): string {
  const year = new Date().getFullYear();
  const digits = crypto.randomInt(10000, 100000); // 5 digits, 10000-99999
  return `PAY-${year}-${digits}`;
}
