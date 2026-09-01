import { env } from "../config/env";

interface ReservationWhatsAppPayload {
  reference: string;
  branchName: string;
  branchCode: "LUSAKA" | "KITWE";
  customerName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string;
  guests: number;
  seating: string;
  depositAmount: number;
  notes?: string | null;
}

/** Mirrors ReservationWhatsAppPayload — see the sendTakeaway* functions below. */
interface TakeawayWhatsAppPayload {
  reference: string;
  branchName: string;
  branchCode: "LUSAKA" | "KITWE";
  customerName: string;
  phone: string;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string;
  totalAmount: number;
  notes?: string | null;
}

const GRAPH_API_BASE = "https://graph.facebook.com";

// Appended to every customer-facing free-text message (staff messages don't
// need it — they already know this). Approved templates carry the same line
// via their Footer field instead, set directly in Meta Business Manager —
// see the template bodies noted alongside WHATSAPP_TEMPLATE_NAME and friends
// in .env.example. Keep this wording in sync with those Footer fields.
const AUTOMATED_DISCLAIMER = "Automated message — replies & calls aren't monitored.";

// All 11 takeaway/catering templates were submitted to Meta under "en_US"
// (see the template-submission scripts from that session), unlike the
// original reservation/loyalty templates which use env.WHATSAPP_TEMPLATE_LANGUAGE
// ("en"). Passed explicitly to every sendWhatsAppTemplate call below —
// omitting it sends the wrong language code and Meta 404s even though the
// template is approved.
const TAKEAWAY_CATERING_TEMPLATE_LANGUAGE = "en_US";

function isConfigured() {
  return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Which admin number(s) a staff alert for a given branch should go to.
 * Falls back to the shared NOTIFY_PHONE_NUMBER if that branch doesn't have
 * its own configured, so a fresh deploy that only sets the old single var
 * keeps working exactly as before. Each NOTIFY_PHONE_NUMBER* var can hold
 * more than one number, comma-separated (e.g.
 * "+260965545454,+260966008080") — every listed number gets its own copy
 * of the alert, for branches with more than one person who needs to see it.
 */
function staffNumbersFor(branchCode: ReservationWhatsAppPayload["branchCode"]): string[] {
  const raw =
    branchCode === "LUSAKA"
      ? (env.NOTIFY_PHONE_NUMBER_LUSAKA ?? env.NOTIFY_PHONE_NUMBER)
      : branchCode === "KITWE"
        ? (env.NOTIFY_PHONE_NUMBER_KITWE ?? env.NOTIFY_PHONE_NUMBER)
        : env.NOTIFY_PHONE_NUMBER;
  if (!raw) return [];
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

/**
 * WhatsApp Cloud API requires E.164 (e.g. +260964599763). Customers naturally
 * type local format (0964599763), so convert 0-prefixed 10-digit Zambian
 * numbers here. Anything already starting with + is passed through untouched.
 */
function toE164Zambia(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[\s-]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `+260${digits.slice(1)}`;
  // Someone typed the 9-digit local number without its leading 0 (e.g.
  // "964599763" instead of "0964599763") — phone validation only requires
  // 9+ digits (see auth/reservation/takeaway validators), so this reaches
  // here un-normalized. Zambian mobile numbers all start with 7 or 9 after
  // the leading 0/country code, so this is a safe heuristic rather than a
  // guess at an arbitrary foreign number. Without this, the number falls
  // through to `return trimmed` below — sent to Meta with no country code
  // at all, which silently fails delivery instead of erroring loudly.
  if (digits.length === 9 && /^[79]/.test(digits)) return `+260${digits}`;
  return trimmed;
}

/**
 * Sends a free-form WhatsApp text message via the Meta Cloud API.
 *
 * IMPORTANT: Meta only delivers free-form ("text") messages to numbers that
 * messaged your business within the last 24h — OR, while this app is still
 * in test mode, numbers you've manually added as test recipients in the
 * Meta App Dashboard. Sending to any other number (i.e. real customers, once
 * this goes live) will be rejected (error 131047) unless this is switched to
 * an approved message *template* ("type": "template") instead. Of the
 * messages in this file, only sendPaymentConfirmedNotification currently has
 * a template fallback wired in — the others are free-form only for now.
 *
 * Silently no-ops (with a console warning) if credentials aren't configured,
 * so local development and demos don't hard-fail on missing WhatsApp setup.
 */
async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const formattedTo = toE164Zambia(to);
  if (!isConfigured()) {
    console.warn(`[whatsapp] Not configured — skipped message to ${formattedTo}`);
    return;
  }

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo.replace(/^\+/, ""), // Graph API wants digits only, no leading +
          type: "text",
          text: { body },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[whatsapp] Failed to send to ${formattedTo}: ${res.status} ${errBody}`);
    } else {
      // Graph API returning 200 here only means the message was QUEUED, not
      // that it was actually delivered — a free-text message to a number
      // that hasn't messaged us within the last 24h gets silently accepted
      // here and then fails later, reported async via the delivery-status
      // webhook (see whatsapp.controller.ts, error code 131047). Logging the
      // message id makes that webhook's later log line traceable back to
      // this specific send instead of the whole thing looking silent.
      const okBody = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
      const msgId = okBody?.messages?.[0]?.id;
      console.log(`[whatsapp] Queued to ${formattedTo}${msgId ? ` (msg ${msgId})` : ""}`);
    }
  } catch (err) {
    console.error(`[whatsapp] Failed to send to ${formattedTo}:`, err);
  }
}

/**
 * Sends a free-form reply to a number that just messaged us — used for the
 * FAQ auto-answers in whatsapp.controller.ts. Always within Meta's 24h
 * free-text window by construction: we only ever call this from inside the
 * inbound webhook handler, in direct response to a message that just
 * arrived, so there's no template requirement here.
 */
export async function sendFaqAutoReply(to: string, body: string): Promise<void> {
  return sendWhatsAppMessage(to, body);
}

/**
 * Builds the {{1}}..{{6}} body parameters for the approved "reservation_confirmation"
 * template (UTILITY, en). Body text:
 *   "Thank you for dining with us, your table at {{1}} is confirmed.
 *    Reference: {{2}}. Date: {{3}} at {{4}}. Guests: {{5}}. Deposit paid: ZMW {{6}}.
 *    We look forward to seeing you!"
 * The header ("Hello.") is static — no header parameters needed. Note {{6}} is
 * the bare number: "ZMW " is already literal text in the template, so don't
 * prefix it here or the message will read "ZMW ZMW 400".
 * If this template is ever edited in Meta Business Manager, update this to match.
 */
function buildConfirmationTemplateParams(p: ReservationWhatsAppPayload) {
  return [p.branchName, p.reference, p.date, p.time, String(p.guests), String(p.depositAmount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

/**
 * Sends an approved WhatsApp template message via the Meta Cloud API.
 * Unlike free-form text, templates can be delivered to any number at any
 * time — no prior message from the recipient and no 24h session required.
 * This is the only reliable way to reach a customer who's never messaged us.
 */
async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: { type: "text"; text: string }[],
  // Meta templates are versioned per exact language code, not just "does
  // this read as English" — the original reservation/loyalty templates were
  // submitted under "en" (env.WHATSAPP_TEMPLATE_LANGUAGE), but the takeaway
  // and catering templates were submitted under "en_US". Sending the wrong
  // code gets a 404 "(#132001) Template name does not exist in the
  // translation" even though the template is APPROVED — it's a genuinely
  // different lookup key to Meta, not a fallback/formatting concern.
  language: string = env.WHATSAPP_TEMPLATE_LANGUAGE,
): Promise<void> {
  const formattedTo = toE164Zambia(to);
  if (!isConfigured()) {
    console.warn(`[whatsapp] Not configured — skipped template message to ${formattedTo}`);
    return;
  }

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo.replace(/^\+/, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: language },
            // Omit entirely for a zero-variable template (e.g. the
            // automated-notice follow-up) — sending an empty parameters
            // array for a template with no {{n}} placeholders isn't the
            // same thing to the Graph API and can be rejected.
            ...(params.length > 0 ? { components: [{ type: "body", parameters: params }] } : {}),
          },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[whatsapp] Template send failed for ${formattedTo}: ${res.status} ${errBody}`);
    } else {
      const okBody = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
      const msgId = okBody?.messages?.[0]?.id;
      console.log(`[whatsapp] Template queued to ${formattedTo}${msgId ? ` (msg ${msgId})` : ""}`);
    }
  } catch (err) {
    console.error(`[whatsapp] Template send failed for ${formattedTo}:`, err);
  }
}

function formatBookingCreatedMessage(p: ReservationWhatsAppPayload): string {
  return [
    `We've received your booking request at ${p.branchName}.`,
    `Ref: ${p.reference}`,
    `${p.date} ${p.time}, ${p.guests} guests, ${p.seating}`,
    `To secure your table, pay a ZMW ${p.depositAmount} deposit via Airtel Money or MTN MoMo, then upload your payment screenshot on the booking page. Your table is held once that's verified.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatUnderReviewMessage(p: ReservationWhatsAppPayload): string {
  return [
    `Thanks — we've received your payment screenshot for ${p.reference} (${p.branchName}).`,
    `We're double-checking a couple of details before confirming your table. You'll hear from us shortly.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatAutoRejectedMessage(p: ReservationWhatsAppPayload, reason: string): string {
  return [
    `We couldn't confirm your payment for ${p.reference} (${p.branchName}).`,
    reason,
    `Please upload a clear screenshot of a successful payment to try again, or contact us if you think this is a mistake.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatRequestNewScreenshotMessage(p: ReservationWhatsAppPayload, notes?: string | null): string {
  return [
    `We need a clearer payment screenshot for your booking ${p.reference} (${p.branchName}).`,
    notes ? notes : `Please re-upload a screenshot showing the full transaction — amount, recipient, status, and date/time.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatConfirmedMessage(p: ReservationWhatsAppPayload): string {
  return [
    `Your table at ${p.branchName} is confirmed!`,
    `Ref: ${p.reference}`,
    `${p.date} ${p.time}, ${p.guests} guests, ${p.seating}`,
    `Deposit received: ZMW ${p.depositAmount} (deducted from your final bill)`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatRejectedMessage(p: ReservationWhatsAppPayload): string {
  return [
    `We couldn't verify the deposit for your booking at ${p.branchName} (Ref: ${p.reference}).`,
    `Please contact us so we can sort this out, or submit a new booking with a valid payment.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatStaffMessage(p: ReservationWhatsAppPayload): string {
  return [
    `New reservation ${p.reference} — ${p.branchName} — awaiting payment`,
    `${p.customerName} (${p.phone}, ${p.email})`,
    `${p.date} ${p.time}, ${p.guests} guests, ${p.seating}`,
    `Deposit: ZMW ${p.depositAmount}`,
    p.notes ? `Notes: ${p.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatStaffReviewMessage(p: ReservationWhatsAppPayload): string {
  return [
    `Payment needs review — ${p.reference} (${p.branchName})`,
    `${p.customerName} (${p.phone})`,
    `Deposit: ZMW ${p.depositAmount} — check the Payments tab in the admin dashboard.`,
  ].join("\n");
}

function buildStaffReviewTemplateParams(p: ReservationWhatsAppPayload) {
  return [p.reference, p.branchName, p.customerName, p.phone, String(p.depositAmount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

/**
 * Fired when a reservation is first created (status PENDING_PAYMENT — see
 * reservation.controller.ts), BEFORE any payment has happened. Tells the
 * customer how to pay and that their table isn't held yet — payment is now
 * a separate step (upload a screenshot) rather than part of this same
 * request. Also pings staff so they know a new booking exists.
 */
export async function sendBookingCreatedNotifications(payload: ReservationWhatsAppPayload) {
  const sends: Promise<void>[] = [sendWhatsAppMessage(payload.phone, formatBookingCreatedMessage(payload))];

  const staffNumbers = staffNumbersFor(payload.branchCode);
  if (staffNumbers.length) {
    for (const num of staffNumbers) sends.push(sendWhatsAppMessage(num, formatStaffMessage(payload)));
  } else {
    console.warn(`[whatsapp] No admin number configured for ${payload.branchCode} — skipped staff notification`);
  }

  await Promise.allSettled(sends);
}

function buildUnderReviewTemplateParams(p: ReservationWhatsAppPayload) {
  return [p.reference, p.branchName].map((text) => ({ type: "text" as const, text }));
}

/**
 * Fired when an uploaded screenshot couldn't be confidently auto-verified
 * and landed in REQUIRES_REVIEW — tells the customer it's in hand (not
 * lost, not ignored) and pings staff that something's actually waiting on
 * them in the Payments tab.
 *
 * Same template-vs-free-text tradeoff as sendPaymentConfirmedNotification,
 * applied to BOTH sends here — the customer message uses
 * WHATSAPP_UNDER_REVIEW_TEMPLATE_NAME when configured, and the staff alert
 * (to that branch's admin number(s) — see staffNumbersFor) uses
 * WHATSAPP_STAFF_REVIEW_TEMPLATE_NAME (submitted to Meta as
 * "staff_payment_review_alert", pending approval as of writing). Until each
 * is approved, that side falls back to free-form text, which Meta only
 * delivers within an open 24h session — this was silently failing to reach
 * staff whenever the admin number hadn't messaged the WhatsApp Business
 * number recently.
 */
export async function sendPaymentUnderReviewNotifications(payload: ReservationWhatsAppPayload) {
  const customerSend = env.WHATSAPP_UNDER_REVIEW_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_UNDER_REVIEW_TEMPLATE_NAME,
        buildUnderReviewTemplateParams(payload),
      )
    : sendWhatsAppMessage(payload.phone, formatUnderReviewMessage(payload));

  const sends: Promise<void>[] = [customerSend];

  const staffNumbers = staffNumbersFor(payload.branchCode);
  if (staffNumbers.length) {
    for (const num of staffNumbers) {
      const staffSend = env.WHATSAPP_STAFF_REVIEW_TEMPLATE_NAME
        ? sendWhatsAppTemplate(num, env.WHATSAPP_STAFF_REVIEW_TEMPLATE_NAME, buildStaffReviewTemplateParams(payload))
        : sendWhatsAppMessage(num, formatStaffReviewMessage(payload));
      sends.push(staffSend);
    }
  } else {
    console.warn(`[whatsapp] No admin number configured for ${payload.branchCode} — skipped review alert`);
  }

  await Promise.allSettled(sends);
}

function buildAutoRejectedTemplateParams(p: ReservationWhatsAppPayload, reason: string) {
  return [p.reference, p.branchName, reason].map((text) => ({ type: "text" as const, text }));
}

/**
 * Fired when the system itself (not a staff member) rejects an upload —
 * screenshot shows a failed transaction, or the transaction ID was already
 * used elsewhere. No staff involvement needed; this is just telling the
 * customer why and inviting a retry.
 */
export async function sendPaymentAutoRejectedNotification(payload: ReservationWhatsAppPayload, reason: string) {
  const send = env.WHATSAPP_AUTO_REJECTED_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_AUTO_REJECTED_TEMPLATE_NAME,
        buildAutoRejectedTemplateParams(payload, reason),
      )
    : sendWhatsAppMessage(payload.phone, formatAutoRejectedMessage(payload, reason));

  await send;
}

function buildRequestScreenshotTemplateParams(p: ReservationWhatsAppPayload, notes?: string | null) {
  const detail =
    notes?.trim() ||
    "Please re-upload a screenshot showing the full transaction — amount, recipient, status, and date/time.";
  return [p.reference, p.branchName, detail].map((text) => ({ type: "text" as const, text }));
}

/** Fired when a staff member asks for a clearer/different screenshot rather than rejecting outright. */
export async function sendRequestNewScreenshotNotification(payload: ReservationWhatsAppPayload, notes?: string | null) {
  const send = env.WHATSAPP_REQUEST_SCREENSHOT_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_REQUEST_SCREENSHOT_TEMPLATE_NAME,
        buildRequestScreenshotTemplateParams(payload, notes),
      )
    : sendWhatsAppMessage(payload.phone, formatRequestNewScreenshotMessage(payload, notes));

  await send;
}

/**
 * Fired the moment a payment is actually confirmed — either automatically
 * (AUTO_VERIFIED) or by a staff member approving a REQUIRES_REVIEW attempt.
 * This is the only point a customer is told their table is confirmed.
 *
 * Uses the approved template (WHATSAPP_TEMPLATE_NAME) when one is
 * configured — required for real customers, who haven't messaged us first.
 * Until a template is approved, it falls back to free-form text, which only
 * actually delivers within an open 24h session (fine for testing with a
 * number that's messaged the business number, not for production).
 */
export async function sendPaymentConfirmedNotification(payload: ReservationWhatsAppPayload) {
  const usingTemplate = Boolean(env.WHATSAPP_TEMPLATE_NAME);
  const send = usingTemplate
    ? sendWhatsAppTemplate(payload.phone, env.WHATSAPP_TEMPLATE_NAME!, buildConfirmationTemplateParams(payload))
    : sendWhatsAppMessage(payload.phone, formatConfirmedMessage(payload));

  await send;

  // The free-text fallback already has AUTOMATED_DISCLAIMER baked into its
  // body — only the templated path needs this separate follow-up, since
  // reservation_confirmation itself is already approved/live and isn't
  // being touched to add a footer.
  if (usingTemplate && env.WHATSAPP_AUTOMATED_NOTICE_TEMPLATE_NAME) {
    await sendWhatsAppTemplate(payload.phone, env.WHATSAPP_AUTOMATED_NOTICE_TEMPLATE_NAME, []);
  }
}

function buildRejectedTemplateParams(p: ReservationWhatsAppPayload) {
  return [p.branchName, p.reference].map((text) => ({ type: "text" as const, text }));
}

/**
 * Fired when a staff member reviews a payment and rejects it outright
 * (cancelling the reservation) — lets the customer know their table was NOT
 * held, rather than leaving them assuming it was.
 */
export async function sendPaymentRejectedNotification(payload: ReservationWhatsAppPayload) {
  const send = env.WHATSAPP_REJECTED_TEMPLATE_NAME
    ? sendWhatsAppTemplate(payload.phone, env.WHATSAPP_REJECTED_TEMPLATE_NAME, buildRejectedTemplateParams(payload))
    : sendWhatsAppMessage(payload.phone, formatRejectedMessage(payload));

  await send;
}

// ---------------------------------------------------------------------------
// Takeaway orders — same shape/pattern as the reservation notifications
// above: template-if-configured-else-free-text on every send (both customer
// AND staff sides — reservations only wired templates onto some of their
// functions; takeaway gets full coverage from the start), AUTOMATED_DISCLAIMER
// on every free-text customer body, fire-and-forget from the controller.
// Until each WHATSAPP_TAKEAWAY_*_TEMPLATE_NAME is submitted to and approved
// by Meta, every one of these runs in free-text fallback — same 24h-session
// limitation every other notification in this file started out with.
// ---------------------------------------------------------------------------

function formatTakeawayOrderCreatedMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `We've received your takeaway order at ${p.branchName}.`,
    `Ref: ${p.reference}`,
    `Pickup: ${p.pickupDate} at ${p.pickupTime} — TAKEAWAY ONLY, NO DELIVERY.`,
    `To confirm your order, pay ZMW ${p.totalAmount} via Airtel Money or MTN MoMo, then upload your payment screenshot on the order page. We start preparing once that's verified.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayCreatedTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.branchName, p.reference, p.pickupDate, p.pickupTime, String(p.totalAmount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

function formatTakeawayStaffMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `New takeaway order ${p.reference} — ${p.branchName} — awaiting payment`,
    `${p.customerName} (${p.phone})`,
    `Pickup: ${p.pickupDate} at ${p.pickupTime}`,
    `Total: ZMW ${p.totalAmount}`,
    p.notes ? `Notes: ${p.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// Name+phone are combined into one variable — Meta rejected the 5-variable
// version of this template as too variable-dense for its length ("Params
// Words Ratio Exceeds Limit"), so name/phone collapse into a single {{3}}
// here to match the approved-for-submission takeaway_staff_new_order body.
function buildTakeawayStaffNewOrderTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.reference, p.branchName, `${p.customerName} (${p.phone})`, String(p.totalAmount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

/**
 * Fired when a takeaway order is first created (PENDING_PAYMENT) — tells the
 * customer their pickup time and how to pay, and pings that branch's staff.
 * Mirrors sendBookingCreatedNotifications, but with template support on both
 * sides from the start (see the header comment above).
 */
export async function sendTakeawayOrderCreatedNotifications(payload: TakeawayWhatsAppPayload) {
  const customerSend = env.WHATSAPP_TAKEAWAY_CREATED_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_CREATED_TEMPLATE_NAME,
        buildTakeawayCreatedTemplateParams(payload),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayOrderCreatedMessage(payload));

  const sends: Promise<void>[] = [customerSend];

  const staffNumbers = staffNumbersFor(payload.branchCode);
  if (staffNumbers.length) {
    for (const num of staffNumbers) {
      const staffSend = env.WHATSAPP_TAKEAWAY_STAFF_NEW_ORDER_TEMPLATE_NAME
        ? sendWhatsAppTemplate(
            num,
            env.WHATSAPP_TAKEAWAY_STAFF_NEW_ORDER_TEMPLATE_NAME,
            buildTakeawayStaffNewOrderTemplateParams(payload),
            TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
          )
        : sendWhatsAppMessage(num, formatTakeawayStaffMessage(payload));
      sends.push(staffSend);
    }
  } else {
    console.warn(`[whatsapp] No admin number configured for ${payload.branchCode} — skipped takeaway staff notification`);
  }

  await Promise.allSettled(sends);
}

function formatTakeawayUnderReviewMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `Thanks — we've received your payment screenshot for ${p.reference} (${p.branchName}).`,
    `We're double-checking a couple of details before we start preparing your order. You'll hear from us shortly.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayUnderReviewTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.reference, p.branchName].map((text) => ({ type: "text" as const, text }));
}

function formatTakeawayStaffReviewMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `Takeaway payment needs review — ${p.reference} (${p.branchName})`,
    `${p.customerName} (${p.phone})`,
    `Total: ZMW ${p.totalAmount} — check the Payments tab in the admin dashboard.`,
  ].join("\n");
}

function buildTakeawayStaffReviewTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.reference, p.branchName, p.customerName, p.phone, String(p.totalAmount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

/** Fired when a takeaway screenshot couldn't be confidently auto-verified. Mirrors sendPaymentUnderReviewNotifications. */
export async function sendTakeawayPaymentUnderReviewNotifications(payload: TakeawayWhatsAppPayload) {
  const customerSend = env.WHATSAPP_TAKEAWAY_UNDER_REVIEW_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_UNDER_REVIEW_TEMPLATE_NAME,
        buildTakeawayUnderReviewTemplateParams(payload),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayUnderReviewMessage(payload));

  const sends: Promise<void>[] = [customerSend];

  const staffNumbers = staffNumbersFor(payload.branchCode);
  if (staffNumbers.length) {
    for (const num of staffNumbers) {
      const staffSend = env.WHATSAPP_TAKEAWAY_STAFF_REVIEW_TEMPLATE_NAME
        ? sendWhatsAppTemplate(
            num,
            env.WHATSAPP_TAKEAWAY_STAFF_REVIEW_TEMPLATE_NAME,
            buildTakeawayStaffReviewTemplateParams(payload),
            TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
          )
        : sendWhatsAppMessage(num, formatTakeawayStaffReviewMessage(payload));
      sends.push(staffSend);
    }
  } else {
    console.warn(`[whatsapp] No admin number configured for ${payload.branchCode} — skipped takeaway review alert`);
  }

  await Promise.allSettled(sends);
}

function formatTakeawayAutoRejectedMessage(p: TakeawayWhatsAppPayload, reason: string): string {
  return [
    `We couldn't confirm your payment for takeaway order ${p.reference} (${p.branchName}).`,
    reason,
    `Please upload a clear screenshot of a successful payment to try again, or contact us if you think this is a mistake.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayAutoRejectedTemplateParams(p: TakeawayWhatsAppPayload, reason: string) {
  return [p.reference, p.branchName, reason].map((text) => ({ type: "text" as const, text }));
}

/** Fired when the system rejects a takeaway screenshot outright (failed/duplicate transaction). */
export async function sendTakeawayPaymentAutoRejectedNotification(payload: TakeawayWhatsAppPayload, reason: string) {
  const send = env.WHATSAPP_TAKEAWAY_AUTO_REJECTED_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_AUTO_REJECTED_TEMPLATE_NAME,
        buildTakeawayAutoRejectedTemplateParams(payload, reason),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayAutoRejectedMessage(payload, reason));

  await send;
}

function formatTakeawayRequestNewScreenshotMessage(p: TakeawayWhatsAppPayload, notes?: string | null): string {
  return [
    `We need a clearer payment screenshot for your takeaway order ${p.reference} (${p.branchName}).`,
    notes ? notes : `Please re-upload a screenshot showing the full transaction — amount, recipient, status, and date/time.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayRequestScreenshotTemplateParams(p: TakeawayWhatsAppPayload, notes?: string | null) {
  const detail =
    notes?.trim() ||
    "Please re-upload a screenshot showing the full transaction — amount, recipient, status, and date/time.";
  return [p.reference, p.branchName, detail].map((text) => ({ type: "text" as const, text }));
}

/** Fired when a staff member asks for a clearer/different screenshot rather than rejecting outright. */
export async function sendTakeawayRequestNewScreenshotNotification(
  payload: TakeawayWhatsAppPayload,
  notes?: string | null,
) {
  const send = env.WHATSAPP_TAKEAWAY_REQUEST_SCREENSHOT_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_REQUEST_SCREENSHOT_TEMPLATE_NAME,
        buildTakeawayRequestScreenshotTemplateParams(payload, notes),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayRequestNewScreenshotMessage(payload, notes));

  await send;
}

function formatTakeawayConfirmedMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `Your takeaway order at ${p.branchName} is confirmed!`,
    `Ref: ${p.reference}`,
    `Pickup: ${p.pickupDate} at ${p.pickupTime} — TAKEAWAY ONLY, NO DELIVERY.`,
    `Total paid: ZMW ${p.totalAmount}`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayConfirmedTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.branchName, p.reference, p.pickupDate, p.pickupTime, String(p.totalAmount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

/** Fired the moment a takeaway payment is confirmed (auto-verified or staff-approved). Mirrors sendPaymentConfirmedNotification. */
export async function sendTakeawayPaymentConfirmedNotification(payload: TakeawayWhatsAppPayload) {
  const send = env.WHATSAPP_TAKEAWAY_CONFIRMED_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_CONFIRMED_TEMPLATE_NAME,
        buildTakeawayConfirmedTemplateParams(payload),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayConfirmedMessage(payload));

  await send;
}

function formatTakeawayRejectedMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `We couldn't verify payment for your takeaway order at ${p.branchName} (Ref: ${p.reference}).`,
    `Please contact us so we can sort this out, or place a new order with a valid payment.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayRejectedTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.branchName, p.reference].map((text) => ({ type: "text" as const, text }));
}

/** Fired when a staff member reviews a takeaway payment and rejects it outright (cancelling the order). */
export async function sendTakeawayPaymentRejectedNotification(payload: TakeawayWhatsAppPayload) {
  const send = env.WHATSAPP_TAKEAWAY_REJECTED_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_REJECTED_TEMPLATE_NAME,
        buildTakeawayRejectedTemplateParams(payload),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayRejectedMessage(payload));

  await send;
}

function formatTakeawayReadyForPickupMessage(p: TakeawayWhatsAppPayload): string {
  return [
    `Your takeaway order ${p.reference} at ${p.branchName} is ready for pickup!`,
    `Pickup time: ${p.pickupTime} — TAKEAWAY ONLY, NO DELIVERY.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildTakeawayReadyTemplateParams(p: TakeawayWhatsAppPayload) {
  return [p.reference, p.branchName, p.pickupTime].map((text) => ({ type: "text" as const, text }));
}

/** Fired when staff mark a takeaway order READY_FOR_PICKUP — a physical hand-off moment reservations don't have. */
export async function sendTakeawayOrderReadyForPickupNotification(payload: TakeawayWhatsAppPayload) {
  const send = env.WHATSAPP_TAKEAWAY_READY_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_TAKEAWAY_READY_TEMPLATE_NAME,
        buildTakeawayReadyTemplateParams(payload),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatTakeawayReadyForPickupMessage(payload));

  await send;
}

interface CateringWhatsAppPayload {
  branchName: string;
  branchCode: "LUSAKA" | "KITWE";
  packageName: string | null;
  customerName: string;
  phone: string;
  eventDate: string; // YYYY-MM-DD
  guestCount: number;
  notes?: string | null;
}

function formatCateringEnquiryReceivedMessage(p: CateringWhatsAppPayload): string {
  return [
    `Thank you for your catering enquiry at ${p.branchName}!`,
    `Package: ${p.packageName ?? "Not specified yet"}`,
    `Event date: ${p.eventDate} · Guests: ${p.guestCount}`,
    `Our team will call you shortly to confirm details and pricing — this isn't a paid booking yet.`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function buildCateringEnquiryTemplateParams(p: CateringWhatsAppPayload) {
  return [p.branchName, p.customerName, p.eventDate, String(p.guestCount)].map((text) => ({
    type: "text" as const,
    text,
  }));
}

function formatCateringStaffMessage(p: CateringWhatsAppPayload): string {
  return [
    `New catering enquiry — ${p.branchName}`,
    `${p.customerName} (${p.phone})`,
    `Package: ${p.packageName ?? "Not specified"}`,
    `Event date: ${p.eventDate} · Guests: ${p.guestCount}`,
    p.notes ? `Notes: ${p.notes}` : null,
    `Follow up by phone — this is an enquiry, not a paid booking.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Same fix as buildTakeawayStaffNewOrderTemplateParams — Meta rejected the
// 6-variable version, so name+phone collapse into one {{2}} here.
function buildCateringStaffTemplateParams(p: CateringWhatsAppPayload) {
  return [p.branchName, `${p.customerName} (${p.phone})`, p.packageName ?? "Not specified", p.eventDate, String(p.guestCount)].map(
    (text) => ({ type: "text" as const, text }),
  );
}

/**
 * Fired when a catering enquiry is submitted — tells the customer we got it
 * (this is a catalog + enquiry model, not a paid checkout, so it's an
 * acknowledgement rather than a confirmation) and pings that branch's staff,
 * same template-if-configured-else-free-text pattern as every other
 * notification in this file.
 */
export async function sendCateringEnquiryNotifications(payload: CateringWhatsAppPayload) {
  const customerSend = env.WHATSAPP_CATERING_ENQUIRY_TEMPLATE_NAME
    ? sendWhatsAppTemplate(
        payload.phone,
        env.WHATSAPP_CATERING_ENQUIRY_TEMPLATE_NAME,
        buildCateringEnquiryTemplateParams(payload),
        TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
      )
    : sendWhatsAppMessage(payload.phone, formatCateringEnquiryReceivedMessage(payload));

  const sends: Promise<void>[] = [customerSend];

  const staffNumbers = staffNumbersFor(payload.branchCode);
  if (staffNumbers.length) {
    for (const num of staffNumbers) {
      const staffSend = env.WHATSAPP_CATERING_STAFF_TEMPLATE_NAME
        ? sendWhatsAppTemplate(
            num,
            env.WHATSAPP_CATERING_STAFF_TEMPLATE_NAME,
            buildCateringStaffTemplateParams(payload),
            TAKEAWAY_CATERING_TEMPLATE_LANGUAGE,
          )
        : sendWhatsAppMessage(num, formatCateringStaffMessage(payload));
      sends.push(staffSend);
    }
  } else {
    console.warn(`[whatsapp] No admin number configured for ${payload.branchCode} — skipped catering enquiry alert`);
  }

  await Promise.allSettled(sends);
}
