import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";
import { sendFaqAutoReply } from "../services/whatsapp.service";

const SITE_URL = "https://indishzambia.com";

/**
 * FAQ auto-answers — deliberately narrow. This only replies when the
 * inbound text matches one of a handful of known basic questions (the same
 * four set as the WhatsApp "ice breaker" prompts). Anything else gets no
 * automated reply at all: a real conversation a customer is having with
 * staff via WhatsApp Manager's Inbox should never get a robotic message
 * injected into it. Keyword-based (not exact-match) so it still catches a
 * customer typing their own version of the question instead of tapping the
 * ice breaker button.
 */
const FAQ_RULES: { test: (text: string) => boolean; reply: string }[] = [
  {
    test: (t) => /\bhour|open|close|time\b/.test(t),
    reply: "We're open 11:30 – 22:00 daily at both our Lusaka and Kitwe branches! 🍽️",
  },
  {
    test: (t) => /\bbook|table|reserv/.test(t),
    reply: `You can book a table online here: ${SITE_URL} — pick your branch and reserve in a couple of taps. Or just reply here with your preferred date, time, and number of guests and we'll help you out!`,
  },
  {
    test: (t) => /\bbranch|location|where|address\b/.test(t),
    reply:
      "We have two branches:\n📍 Lusaka — Shop No. 10, East Park Mall, next to Sikale Deco\n📍 Kitwe — Shop No. 32, ECL Mall, Block B / Unit 10, next to Sikale Wood, Parklands",
  },
  {
    test: (t) => /\bmenu|food|dish|eat\b/.test(t),
    reply: `Browse our full menu here: ${SITE_URL} — select your branch to see what's available there, including our Chef's Specials!`,
  },
];

/** Recently-processed inbound message IDs, so a webhook retry (Meta resends
 *  on anything but a fast 200) never sends a duplicate auto-reply. Capped
 *  and pruned rather than using a real store — losing this on a restart is
 *  harmless, worst case is one duplicate reply during a redeploy window. */
const seenMessageIds = new Set<string>();
function alreadyHandled(id: string): boolean {
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.add(id);
  if (seenMessageIds.size > 500) {
    const oldest = seenMessageIds.values().next().value;
    if (oldest) seenMessageIds.delete(oldest);
  }
  return false;
}

/** GET — Meta's one-time webhook verification handshake when you register
 *  the callback URL in the App Dashboard. */
export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(String(challenge ?? ""));
    return;
  }
  res.sendStatus(403);
}

/** Constant-time signature check against Meta's X-Hub-Signature-256 header,
 *  so only Meta (who knows WHATSAPP_APP_SECRET) can POST here successfully. */
function isValidSignature(req: Request): boolean {
  if (!env.WHATSAPP_APP_SECRET) return false;
  const header = req.get("X-Hub-Signature-256");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!header || !rawBody) return false;

  const expected = "sha256=" + createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** POST — actual inbound events (messages, statuses, etc). We only ever act
 *  on inbound text messages; everything else is acknowledged and ignored. */
export async function receiveWebhook(req: Request, res: Response) {
  // Always 200 quickly — Meta retries aggressively on non-200s, and a
  // rejected/slow webhook can get the subscription throttled or dropped.
  // Signature failures still get logged, just not surfaced to the caller.
  if (!isValidSignature(req)) {
    console.warn("[whatsapp webhook] Invalid or missing signature — ignoring payload");
    res.sendStatus(200);
    return;
  }

  try {
    const entries = req.body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? [];
        for (const message of messages) {
          if (message.type !== "text") continue;
          if (alreadyHandled(message.id)) continue;

          const text = String(message.text?.body ?? "").toLowerCase();
          const rule = FAQ_RULES.find((r) => r.test(text));
          if (!rule) continue; // Not a recognized FAQ — leave it for staff in the Inbox.

          await sendFaqAutoReply(message.from, rule.reply);
        }

        // Delivery-status callbacks for messages WE sent (sent/delivered/read/failed)
        // arrive here too, not in `messages` — logging `failed` is the only way to
        // see *why* a template/text send didn't reach someone, since the initial
        // send API response only confirms Meta accepted it into the queue.
        const statuses = change.value?.statuses ?? [];
        for (const status of statuses) {
          if (status.status === "failed") {
            console.error(
              `[whatsapp webhook] Delivery FAILED to ${status.recipient_id} (msg ${status.id}):`,
              JSON.stringify(status.errors ?? status),
            );
          } else {
            console.log(`[whatsapp webhook] ${status.recipient_id} — ${status.status} (msg ${status.id})`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp webhook] Failed to process payload:", err);
  }

  res.sendStatus(200);
}
