import { getCookie } from "@tanstack/react-start/server";

import { pool } from "@/lib/server/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/auth";
import { mapStaff, type StaffRow } from "@/lib/server/mappers";
import type { Staff } from "@/lib/types";

// Every page load calls several server functions (e.g. the layout's
// beforeLoad, plus one requireStaff() inside each server fn a loader calls),
// and each one used to re-run "SELECT * FROM staff WHERE id = ?" against the
// remote DB. On a hosted MySQL instance that's several redundant network
// round-trips per navigation, which is the main thing that made the app feel
// slow. We collapse those into a single query by caching the result per
// session token for a few seconds — long enough to dedupe the queries that
// happen within one page load, short enough that role/active changes (e.g.
// disabling a staff account) still take effect almost immediately.
const STAFF_CACHE_TTL_MS = 5_000;
const staffCache = new Map<string, { staff: Staff | null; expires: number }>();

async function fetchStaff(staffId: string): Promise<Staff | null> {
  const [rows] = await pool.query<StaffRow[]>(
    "SELECT * FROM staff WHERE id = ? AND active = 1 LIMIT 1",
    [staffId],
  );
  const row = rows[0];
  return row ? mapStaff(row) : null;
}

/** Reads + verifies the session cookie and loads the staff row it points to. */
export async function getSessionStaff(): Promise<Staff | null> {
  const token = getCookie(SESSION_COOKIE);
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const cached = staffCache.get(token!);
  if (cached && cached.expires > Date.now()) {
    return cached.staff;
  }

  const staff = await fetchStaff(payload.staffId);
  staffCache.set(token!, { staff, expires: Date.now() + STAFF_CACHE_TTL_MS });
  return staff;
}

/** Call after any mutation to staff (role/active/name changes) so the next
 * request sees fresh data instead of waiting out the cache TTL. */
export function invalidateStaffCache(): void {
  staffCache.clear();
}
