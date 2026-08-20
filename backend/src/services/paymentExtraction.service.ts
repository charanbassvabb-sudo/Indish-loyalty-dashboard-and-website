/**
 * Turns raw OCR text from an Airtel Money / MTN MoMo screenshot into
 * structured fields. This is inherently heuristic — screenshots vary by
 * phone, app version, and OCR quality — so every field is nullable and
 * callers (paymentVerification.service.ts) must treat a missing field as
 * "unknown", never as a pass.
 */

export interface ExtractedPaymentFields {
  amount: number | null;
  transactionId: string | null;
  sender: string | null;
  recipient: string | null;
  /** Raw matched date string, not parsed to a Date — formats vary too much
   *  to trust a single parse; see parseExtractedDate() for the best-effort attempt. */
  date: string | null;
  time: string | null;
  status: "successful" | "failed" | "pending" | "unknown";
}

const AMOUNT_PATTERNS = [
  /amount[:\s]+(?:paid|sent)?[:\s]*(?:zmw|zk|k)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:zmw|zk)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /\bk\s?([\d,]+\.\d{2})\b/i,
];

const TRANSACTION_ID_PATTERNS = [
  /(?:transaction\s*id|txn\s*id|trans\s*id|financial\s*transaction\s*id)[:\s]+([A-Za-z0-9.\-]{5,})/i,
  /(?:reference|ref\.?\s*no\.?|receipt\s*no\.?)[:\s]+([A-Za-z0-9.\-]{5,})/i,
];

// Zambian mobile numbers: 10 digits starting 0, or +260/260 followed by 9 digits.
const PHONE_PATTERN = /(?:\+?260|0)\d{9}/g;

const DATE_PATTERNS = [
  /\b(\d{4}-\d{1,2}-\d{1,2})\b/,
  /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
  /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})\b/i,
];

const TIME_PATTERN = /\b(\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm)?)\b/i;

const FAILED_KEYWORDS = ["failed", "declined", "unsuccessful", "cancelled", "canceled", "insufficient", "error"];
const SUCCESS_KEYWORDS = ["successful", "success", "completed", "confirmed", "complete"];
const PENDING_KEYWORDS = ["pending", "processing", "in progress"];

function normalizeAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function detectStatus(text: string): ExtractedPaymentFields["status"] {
  const lower = text.toLowerCase();
  if (FAILED_KEYWORDS.some((kw) => lower.includes(kw))) return "failed";
  if (SUCCESS_KEYWORDS.some((kw) => lower.includes(kw))) return "successful";
  if (PENDING_KEYWORDS.some((kw) => lower.includes(kw))) return "pending";
  return "unknown";
}

/**
 * Phone numbers are usually labelled ("To: 0977...", "From: 0977...",
 * "Recipient", "Sender", "Received by") — try to use that label to tell
 * sender from recipient. Falls back to positional guessing (first number =
 * sender, second = recipient) when no labels are found, which is weaker
 * evidence — matchRecipient in the verification step should be treated
 * cautiously when this fallback was used.
 */
function extractPhones(text: string): { sender: string | null; recipient: string | null } {
  const lines = text.split(/\r?\n/);
  let sender: string | null = null;
  let recipient: string | null = null;

  for (const line of lines) {
    const numbers = line.match(PHONE_PATTERN);
    if (!numbers) continue;
    const lower = line.toLowerCase();
    if (!sender && /(from|sender|paid\s*by)/.test(lower)) sender = numbers[0]!;
    if (!recipient && /(to|recipient|received\s*by|paid\s*to)/.test(lower)) recipient = numbers[0]!;
  }

  if (!sender || !recipient) {
    const allNumbers = text.match(PHONE_PATTERN) ?? [];
    const unique = [...new Set(allNumbers)];
    if (!sender && unique[0]) sender = unique[0];
    if (!recipient && unique[1]) recipient = unique[1];
  }

  return { sender, recipient };
}

export function extractPaymentFields(rawText: string): ExtractedPaymentFields {
  const amountRaw = firstMatch(rawText, AMOUNT_PATTERNS);
  const transactionId = firstMatch(rawText, TRANSACTION_ID_PATTERNS);
  const { sender, recipient } = extractPhones(rawText);
  const date = firstMatch(rawText, DATE_PATTERNS.map((p) => new RegExp(p, p.flags.includes("i") ? "i" : "")));
  const timeMatch = rawText.match(TIME_PATTERN);

  return {
    amount: amountRaw ? normalizeAmount(amountRaw) : null,
    transactionId,
    sender,
    recipient,
    date,
    time: timeMatch?.[1]?.trim() ?? null,
    status: detectStatus(rawText),
  };
}

/** Strips everything but digits, then compares the last 9 (drops country code / leading 0). */
export function normalizePhoneForComparison(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-9);
}

/**
 * Best-effort parse of the extracted date string into a real Date. Returns
 * null if unparseable — callers must treat that as "unknown", not "old".
 */
export function parseExtractedDate(dateStr: string, timeStr: string | null): Date | null {
  const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  const parsed = new Date(combined);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const dateOnly = new Date(dateStr);
  return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
}
