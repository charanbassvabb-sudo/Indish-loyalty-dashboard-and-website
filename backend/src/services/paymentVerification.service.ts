import {
  extractPaymentFields,
  normalizePhoneForComparison,
  parseExtractedDate,
  type ExtractedPaymentFields,
} from "./paymentExtraction.service";

/** How old a screenshot's own date/time can be before it's treated as stale
 *  (e.g. someone reusing a receipt from a previous, unrelated payment). */
const MAX_PAYMENT_AGE_HOURS = 48;

export type VerificationDecision = "AUTO_VERIFIED" | "REQUIRES_REVIEW" | "PAYMENT_FAILED" | "DUPLICATE";

export interface VerificationInput {
  rawText: string;
  expectedAmount: number;
  expectedRecipient: string;
  /** Transaction IDs already used by a previously AUTO_VERIFIED/APPROVED attempt (any reservation). */
  usedTransactionIds: Set<string>;
}

export interface VerificationResult {
  extracted: ExtractedPaymentFields;
  matchAmount: boolean | null;
  matchRecipient: boolean | null;
  matchStatus: boolean | null;
  matchRecency: boolean | null;
  matchNotDuplicate: boolean | null;
  confidenceScore: number;
  decision: VerificationDecision;
}

export function verifyPaymentScreenshot(input: VerificationInput): VerificationResult {
  const extracted = extractPaymentFields(input.rawText);

  // Every field/match below is computed unconditionally, even when the
  // decision is going to be DUPLICATE or PAYMENT_FAILED and won't actually
  // weigh into it — an admin (or the customer) looking at "what we found"
  // shouldn't see "unclear" next to a value that was, in fact, clearly
  // read; it just wasn't the deciding factor.
  const matchNotDuplicate = extracted.transactionId
    ? !input.usedTransactionIds.has(extracted.transactionId.toUpperCase())
    : null;

  const matchAmount =
    extracted.amount === null ? null : Math.abs(extracted.amount - input.expectedAmount) < 0.01;

  const matchRecipient =
    extracted.recipient === null
      ? null
      : normalizePhoneForComparison(extracted.recipient) === normalizePhoneForComparison(input.expectedRecipient);

  const matchStatus = extracted.status === "unknown" ? null : extracted.status === "successful";

  let matchRecency: boolean | null = null;
  if (extracted.date) {
    const parsed = parseExtractedDate(extracted.date, extracted.time);
    if (parsed) {
      const ageHours = (Date.now() - parsed.getTime()) / (1000 * 60 * 60);
      // Negative ageHours (a "future" timestamp) is just as suspicious as a
      // stale one — most likely a date OCR misread, not a real payment.
      matchRecency = ageHours >= -1 && ageHours <= MAX_PAYMENT_AGE_HOURS;
    }
  }

  const confidenceScore = [
    extracted.transactionId ? 20 : 0,
    matchAmount ? 25 : 0,
    matchRecipient ? 25 : 0,
    matchStatus ? 20 : 0,
    matchRecency === true ? 10 : 0,
  ].reduce((a, b) => a + b, 0);

  const base = { extracted, matchAmount, matchRecipient, matchStatus, matchRecency, matchNotDuplicate };

  // A confirmed duplicate is decisive regardless of anything else — someone
  // is trying to reuse a real transaction that already paid for a different
  // booking.
  if (matchNotDuplicate === false) {
    return { ...base, confidenceScore: 0, decision: "DUPLICATE" };
  }

  // Likewise, a screenshot that itself says the transaction failed is
  // unambiguous — no need to make a human look at it.
  if (extracted.status === "failed") {
    return { ...base, confidenceScore: 0, decision: "PAYMENT_FAILED" };
  }

  // AUTO_VERIFIED requires every checkable field to positively match, AND a
  // transaction ID to actually exist (nothing to protect against reuse
  // without one) AND the date, if we could read it, not to be stale/future.
  // Anything less confident — a field OCR couldn't read, a mismatch, or an
  // unparseable date — falls through to REQUIRES_REVIEW rather than being
  // auto-approved on a guess.
  const autoVerified =
    Boolean(extracted.transactionId) &&
    matchAmount === true &&
    matchRecipient === true &&
    matchStatus === true &&
    matchRecency !== false;

  return { ...base, confidenceScore, decision: autoVerified ? "AUTO_VERIFIED" : "REQUIRES_REVIEW" };
}
