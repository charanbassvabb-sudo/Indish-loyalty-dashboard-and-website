// WhatsApp Cloud API (Meta) notifications for loyalty registrations.
// Mirrors backend/src/services/whatsapp.service.ts in the restaurant app —
// same Meta Business number/account, same free-text-vs-template tradeoff:
// a brand-new customer has never messaged the business number before, so a
// free-text welcome message only delivers within an open 24h session (fine
// for staff/testing); reaching them reliably needs an approved template —
// see WHATSAPP_TEMPLATE_NAME below.

interface RegistrationNotificationPayload {
  customerName: string;
  phone: string;
  loyaltyId: string;
  branchName: string;
  rewardVisit: number;
  campaignDuration: number;
}

interface VisitProgressNotificationPayload {
  customerName: string;
  phone: string;
  branchName: string;
  visitCount: number;
  rewardVisit: number;
}

const GRAPH_API_BASE = "https://graph.facebook.com";

function apiVersion() {
  return process.env.WHATSAPP_API_VERSION ?? "v21.0";
}

function isConfigured() {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
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
  return trimmed;
}

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const formattedTo = toE164Zambia(to);
  if (!isConfigured()) {
    console.warn(`[whatsapp] Not configured — skipped message to ${formattedTo}`);
    return;
  }

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${apiVersion()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo.replace(/^\+/, ""),
          type: "text",
          text: { body },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[whatsapp] Failed to send to ${formattedTo}: ${res.status} ${errBody}`);
    }
  } catch (err) {
    console.error(`[whatsapp] Failed to send to ${formattedTo}:`, err);
  }
}

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: { type: "text"; text: string }[],
): Promise<void> {
  const formattedTo = toE164Zambia(to);
  if (!isConfigured()) {
    console.warn(`[whatsapp] Not configured — skipped template message to ${formattedTo}`);
    return;
  }

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${apiVersion()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo.replace(/^\+/, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: process.env.WHATSAPP_LOYALTY_TEMPLATE_LANGUAGE ?? "en" },
            components: [{ type: "body", parameters: params }],
          },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[whatsapp] Template send failed for ${formattedTo}: ${res.status} ${errBody}`);
    }
  } catch (err) {
    console.error(`[whatsapp] Template send failed for ${formattedTo}:`, err);
  }
}

// Kept in sync with the restaurant backend's AUTOMATED_DISCLAIMER (see
// backend/src/services/whatsapp.service.ts). Only appears in the free-text
// fallback below — the approved loyalty_registered template has no footer
// variable, and (like reservation_confirmation on the restaurant side)
// isn't being re-submitted just to add one.
const AUTOMATED_DISCLAIMER = "Automated message — replies & calls aren't monitored.";

function formatCustomerMessage(p: RegistrationNotificationPayload): string {
  return [
    `Welcome to ${p.branchName} Loyalty, ${p.customerName}!`,
    `Your loyalty ID: ${p.loyaltyId}`,
    `Visit ${p.rewardVisit} times within ${p.campaignDuration} days to earn your reward.`,
    `We're glad to have you with us!`,
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

function formatOwnerMessage(p: RegistrationNotificationPayload): string {
  return [
    `New loyalty signup — ${p.branchName}`,
    `${p.customerName} (${p.phone})`,
    `Loyalty ID: ${p.loyaltyId}`,
  ].join("\n");
}

/**
 * Notifies the newly-registered customer and the configured owner/staff
 * number (LOYALTY_NOTIFY_PHONE_NUMBER). Called from registerCustomerFn.
 *
 * WHATSAPP_LOYALTY_TEMPLATE_NAME points at loyalty_registered — a UTILITY
 * template (reaches every customer regardless of marketing opt-in, unlike
 * the also-approved but MARKETING-classified loyalty_welcome). Its body
 * only takes 3 variables ({{1}} name, {{2}} branch, {{3}} loyalty ID), so
 * the visit-target/campaign-length detail that the free-text fallback below
 * includes isn't in the templated message — it's already shown on-screen
 * at registration.
 */
export async function sendRegistrationNotifications(payload: RegistrationNotificationPayload) {
  const templateName = process.env.WHATSAPP_LOYALTY_TEMPLATE_NAME;
  const customerSend = templateName
    ? sendWhatsAppTemplate(payload.phone, templateName, [
        { type: "text", text: payload.customerName },
        { type: "text", text: payload.branchName },
        { type: "text", text: payload.loyaltyId },
      ])
    : sendWhatsAppMessage(payload.phone, formatCustomerMessage(payload));

  const sends: Promise<void>[] = [customerSend];

  const ownerNumber = process.env.LOYALTY_NOTIFY_PHONE_NUMBER;
  if (ownerNumber) {
    sends.push(sendWhatsAppMessage(ownerNumber, formatOwnerMessage(payload)));
  } else {
    console.warn("[whatsapp] LOYALTY_NOTIFY_PHONE_NUMBER not set — skipped owner notification");
  }

  await Promise.allSettled(sends);
}

/**
 * The one line that differs between an ordinary visit and the
 * reward-unlocking one. Deliberately plain/factual wording (no "unlock",
 * no exclamation marks, no emoji) — the first version of this ("...to
 * unlock your reward!") got auto-reclassified from UTILITY to MARKETING
 * by Meta's template reviewer despite being submitted as UTILITY, which
 * defeats the point (a MARKETING template can be blocked by a customer's
 * marketing opt-out). Kept neutral here to give the resubmission the best
 * chance of actually staying UTILITY.
 */
function visitProgressClause(p: VisitProgressNotificationPayload): string {
  const remaining = p.rewardVisit - p.visitCount;
  if (remaining <= 0) return "Your reward is now available — please see a staff member.";
  return `${remaining} visit${remaining === 1 ? "" : "s"} remain before your reward is available.`;
}

function formatVisitProgressMessage(p: VisitProgressNotificationPayload): string {
  return [
    `Hi ${p.customerName}, your visit at ${p.branchName} has been recorded.`,
    `Visit count: ${p.visitCount} of ${p.rewardVisit}.`,
    visitProgressClause(p),
    AUTOMATED_DISCLAIMER,
  ].join("\n");
}

/**
 * Notifies a customer after a visit is logged (addVisitFn) — separate from
 * registration, which already covers their very first visit. Not yet wired
 * to a template: loyalty_visit_update_v2 was submitted to Meta for approval
 * (UTILITY — see visitProgressClause() above for why it's "_v2" and why the
 * wording is deliberately neutral) but is still PENDING as of writing.
 * Until WHATSAPP_VISIT_UPDATE_TEMPLATE_NAME is set, this only actually
 * delivers within an open 24h session — fine for testing, not for real
 * customers who haven't messaged the business first.
 */
export async function sendVisitProgressNotification(payload: VisitProgressNotificationPayload) {
  const templateName = process.env.WHATSAPP_VISIT_UPDATE_TEMPLATE_NAME;
  const send = templateName
    ? sendWhatsAppTemplate(payload.phone, templateName, [
        { type: "text", text: payload.customerName },
        { type: "text", text: payload.branchName },
        { type: "text", text: String(payload.visitCount) },
        { type: "text", text: String(payload.rewardVisit) },
        { type: "text", text: visitProgressClause(payload) },
      ])
    : sendWhatsAppMessage(payload.phone, formatVisitProgressMessage(payload));

  await send;
}
