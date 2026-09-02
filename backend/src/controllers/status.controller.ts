import type { Request, Response } from "express";
import { readFileSync, statSync } from "node:fs";
import { prisma } from "../lib/prisma";

// Paths are specific to this project's one production droplet (see
// deploy.yml and uptime-monitor.mjs, which are what actually write these
// files) — not meant to be portable, this endpoint only ever runs there.
const UPTIME_STATE_PATH = "/var/www/indish/uptime-state.json";
const DEPLOY_LOG_PATH = "/var/www/indish/deploy-log.jsonl";
const ERROR_LOG_PATH = "/var/log/indish/api-error.log";
const OUT_LOG_PATH = "/var/log/indish/api-out.log";

interface UptimeState {
  consecutiveFailures: number;
  alerted: boolean;
}

interface DeployRecord {
  sha: string;
  message: string;
  actor: string;
  time: string;
  status: string;
}

function readJsonSafe<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function readLastDeploy(): DeployRecord | null {
  try {
    const lines = readFileSync(DEPLOY_LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    return last ? (JSON.parse(last) as DeployRecord) : null;
  } catch {
    return null;
  }
}

/**
 * Groups the last day of error-log lines into a short, human-readable
 * summary instead of a raw tail — a restaurant owner checking this from
 * their phone wants "11x WhatsApp template errors, most recent 2h ago", not
 * a wall of JSON. Groups by the message with any run-specific bits (phone
 * numbers, wamids, template names) blanked out, so repeats of the same
 * underlying issue collapse into one line.
 */
function summarizeRecentErrors(): { summary: string; count: number; lastSeen: string }[] {
  let raw: string;
  try {
    raw = readFileSync(ERROR_LOG_PATH, "utf8");
  } catch {
    return [];
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const groups = new Map<string, { count: number; lastSeen: string }>();

  for (const line of raw.split("\n")) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (!m) continue;
    const ts = m[1] + "Z";
    if (new Date(ts).getTime() < cutoff) continue;

    const key = line
      .replace(m[1], "")
      .replace(/^:\s*/, "")
      .replace(/\+?\d{9,}/g, "<number>")
      .replace(/wamid\.[A-Za-z0-9+/=]+/g, "<msg-id>")
      .slice(0, 140);

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (ts > existing.lastSeen) existing.lastSeen = ts;
    } else {
      groups.set(key, { count: 1, lastSeen: ts });
    }
  }

  return Array.from(groups.entries())
    .map(([summary, v]) => ({ summary: summary.trim(), ...v }))
    .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1))
    .slice(0, 10);
}

interface WhatsAppEvent {
  time: string;
  to: string;
  kind: "text" | "template";
  status: "sent" | "failed";
  detail?: string;
}

/**
 * every WhatsApp send in whatsapp.service.ts logs one line, success via
 * console.log ("Queued to X" / "Template queued to X" -> api-out.log) or
 * failure via console.error ("Failed to send to X: ..." / "Template send
 * failed for X: ..." -> api-error.log). This reads both, in the last 24h,
 * and turns them into one merged, newest-first timeline — "did the
 * confirmation actually reach the customer" is exactly what a restaurant
 * owner wants to sanity-check, and this was previously only visible by
 * SSHing in and grepping two separate log files.
 */
function summarizeWhatsAppActivity(): { totalSent: number; totalFailed: number; events: WhatsAppEvent[] } {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const events: WhatsAppEvent[] = [];

  function scan(path: string, status: "sent" | "failed") {
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      return;
    }
    for (const line of raw.split("\n")) {
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (!tsMatch) continue;
      const time = tsMatch[1] + "Z";
      if (new Date(time).getTime() < cutoff) continue;

      const idx = line.indexOf("[whatsapp]");
      if (idx === -1) continue;
      const rest = line.slice(idx + "[whatsapp]".length).trim();

      const isSent = /queued to/i.test(rest);
      const isFailed = /failed/i.test(rest);
      if (status === "sent" && !isSent) continue;
      if (status === "failed" && !isFailed) continue;

      const toMatch = rest.match(/(?:to|for)\s+(\+?\d[\d\s-]*\d)/i);
      if (!toMatch) continue;

      events.push({
        time,
        to: toMatch[1].replace(/\s/g, ""),
        kind: /^template/i.test(rest) ? "template" : "text",
        status,
        detail: status === "failed" ? rest.slice(0, 160) : undefined,
      });
    }
  }

  scan(OUT_LOG_PATH, "sent");
  scan(ERROR_LOG_PATH, "failed");

  events.sort((a, b) => (a.time < b.time ? 1 : -1));

  return {
    totalSent: events.filter((e) => e.status === "sent").length,
    totalFailed: events.filter((e) => e.status === "failed").length,
    events: events.slice(0, 30),
  };
}

export async function getAdminStatus(_req: Request, res: Response) {
  let dbUp = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbUp = false;
  }

  const uptimeState = readJsonSafe<UptimeState>(UPTIME_STATE_PATH);
  let externalCheckAt: string | null = null;
  try {
    externalCheckAt = statSync(UPTIME_STATE_PATH).mtime.toISOString();
  } catch {
    // Monitor hasn't run yet — fine, just report null.
  }

  res.json({
    apiUp: true,
    dbUp,
    externalCheck: uptimeState
      ? {
          up: uptimeState.consecutiveFailures === 0,
          consecutiveFailures: uptimeState.consecutiveFailures,
          checkedAt: externalCheckAt,
        }
      : null,
    lastDeploy: readLastDeploy(),
    recentErrors: summarizeRecentErrors(),
    whatsapp: summarizeWhatsAppActivity(),
  });
}
