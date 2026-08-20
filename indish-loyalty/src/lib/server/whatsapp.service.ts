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

/**
 * Once a loyalty-registration template is approved in Meta Business Manager,
 * set WHATSAPP_LOYALTY_TEMPLATE_NAME and update this parameter list (order
 * must match the template body's {{1}}, {{2}}, ... variables exactly) — see
 * buildConfirmationTemplateParams() in the restaurant app for the pattern.
 */
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
// backend/src/services/whatsapp.service.ts) and the Footer field on the
// loyalty_registered template, once approved.
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
 */
export async function sendRegistrationNotifications(payload: RegistrationNotificationPayload) {
  const templateName = process.env.WHATSAPP_LOYALTY_TEMPLATE_NAME;
  const customerSend = templateName
    ? sendWhatsAppTemplate(payload.phone, templateName, [
        { type: "text", text: payload.customerName },
        { type: "text", text: payload.branchName },
        { type: "text", text: payload.loyaltyId },
        { type: "text", text: String(payload.rewardVisit) },
        { type: "text", text: String(payload.campaignDuration) },
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
