import type { Request, Response } from "express";
import { readFileSync, statSync } from "node:fs";
import { prisma } from "../lib/prisma";

// Paths are specific to this project's one production droplet (see
// deploy.yml and uptime-monitor.mjs, which are what actually write these
// files) — not meant to be portable, this endpoint only ever runs there.
const UPTIME_STATE_PATH = "/var/www/indish/uptime-state.json";
const DEPLOY_LOG_PATH = "/var/www/indish/deploy-log.jsonl";
const ERROR_LOG_PATH = "/var/log/indish/api-error.log";

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
  });
}
