import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DEPOSIT_PER_GUEST_ZMW: z.coerce.number().default(100),

  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  // Set once a reservation-confirmation template is approved in Meta Business
  // Manager. Until then, customer confirmations fall back to a free-form text
  // message, which Meta only delivers to numbers that messaged us first.
  WHATSAPP_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en_US"),
  // Same 24h-free-text problem as the confirmation message applies to every
  // one of these — without an approved template, each only actually
  // delivers to customers who've messaged us first. See the matching
  // sendXxxNotification() functions in whatsapp.service.ts.
  WHATSAPP_UNDER_REVIEW_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_AUTO_REJECTED_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_REJECTED_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_REQUEST_SCREENSHOT_TEMPLATE_NAME: z.string().optional(),
  // Sent as a small follow-up message right after reservation_confirmation
  // specifically — that template is already approved and live, so rather
  // than resubmit it just to add a disclaimer footer (which would need
  // re-review), a second, separate, zero-variable template carries the same
  // line instead. See sendPaymentConfirmedNotification().
  WHATSAPP_AUTOMATED_NOTICE_TEMPLATE_NAME: z.string().optional(),
  // Staff-facing alert (not customer-facing) — same 24h-free-text limitation
  // applies to NOTIFY_PHONE_NUMBER too: without this, "payment needs review"
  // pings only actually deliver if that phone has messaged the WhatsApp
  // Business number within the last 24h. See sendPaymentUnderReviewNotifications().
  WHATSAPP_STAFF_REVIEW_TEMPLATE_NAME: z.string().optional(),
  // Per-branch admin numbers — each branch's own admin gets pinged for that
  // branch's reservations (new booking + payment-needs-review) instead of
  // everything going to one shared number. NOTIFY_PHONE_NUMBER is kept as a
  // fallback: used for any branch that doesn't have its own number set, so
  // this stays backward-compatible with existing single-number setups.
  NOTIFY_PHONE_NUMBER: z.string().optional(),
  NOTIFY_PHONE_NUMBER_LUSAKA: z.string().optional(),
  NOTIFY_PHONE_NUMBER_KITWE: z.string().optional(),
  // Inbound-message webhook (auto-answers to basic FAQ questions — see
  // whatsapp.controller.ts). VERIFY_TOKEN is a secret we invent ourselves and
  // paste into Meta's App Dashboard webhook config so Meta's verification
  // handshake can prove it's really talking to our endpoint. APP_SECRET is
  // Meta's own value (App Dashboard > Settings > Basic > App Secret) used to
  // verify the X-Hub-Signature-256 header on every incoming webhook call —
  // without it, anyone who finds the URL could POST fake messages to it.
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),

  ADMIN_COOKIE_NAME: z.string().default("indish_admin_token"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
