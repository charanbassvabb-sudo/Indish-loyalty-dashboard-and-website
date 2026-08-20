import { randomUUID } from "node:crypto";

import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/server/db";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/server/auth";
import { getSessionStaff, invalidateStaffCache } from "@/lib/server/session.server";
import { BRANCH_COOKIE, BRANCH_MAX_AGE_SECONDS, getSelectedBranch } from "@/lib/server/branch.server";
import { sendRegistrationNotifications } from "@/lib/server/whatsapp.service";
import {
  mapCustomer,
  mapSettings,
  mapStaff,
  mapVisit,
  type CustomerRow,
  type SettingsRow,
  type StaffRow,
  type VisitRow,
} from "@/lib/server/mappers";
import type { BranchCode, Customer, Settings } from "@/lib/types";

function unauthorized(): never {
  throw new Error("Not signed in");
}

function forbidden(): never {
  throw new Error("Managers only");
}

async function requireStaff() {
  const staff = await getSessionStaff();
  if (!staff) unauthorized();
  return staff;
}

async function requireManager() {
  const staff = await requireStaff();
  if (staff.role !== "manager") forbidden();
  return staff;
}

// ---------------------------------------------------------------- auth ----

export const getCurrentStaffFn = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionStaff();
});

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const [rows] = await pool.query<StaffRow[]>(
      "SELECT * FROM staff WHERE username = ? AND active = 1 LIMIT 1",
      [data.username.trim().toLowerCase()],
    );
    const row = rows[0];
    if (!row) throw new Error("Invalid username or password");

    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) throw new Error("Invalid username or password");

    const token = createSessionToken(row.id);
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return mapStaff(row);
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
});

// -------------------------------------------------------------- branch ----

export const getSelectedBranchFn = createServerFn({ method: "GET" }).handler(async () => {
  return getSelectedBranch();
});

export const setBranchFn = createServerFn({ method: "POST" })
  .validator((data: { branch: BranchCode }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    setCookie(BRANCH_COOKIE, data.branch, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: BRANCH_MAX_AGE_SECONDS,
    });
    return { branch: data.branch };
  });

// ----------------------------------------------------------- customers ----

export const listCustomersFn = createServerFn({ method: "GET" })
  .validator((data: { branch: BranchCode }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    const [rows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM customers WHERE branch = ? ORDER BY created_at DESC",
      [data.branch],
    );
    return rows.map(mapCustomer);
  });

// Deliberately NOT branch-scoped — this backs the cross-branch "quick
// search" page. A customer who registered at Lusaka and later walks into
// Kitwe needs to be findable by Kitwe staff so their existing campaign
// carries over instead of getting re-registered from scratch. The regular
// per-branch customer list (listCustomersFn, above) stays scoped since
// that view is "my branch's roster", not a lookup tool.
export const listAllCustomersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers ORDER BY created_at DESC");
  return rows.map(mapCustomer);
});

/** Last 9 digits of a phone number, digits only — the Zambian subscriber
 *  number without a leading 0 or +260, so "0971234567", "+260971234567",
 *  and "260 971 234 567" all normalize the same way for matching. */
function phoneKey(raw: string): string {
  return raw.replace(/\D/g, "").slice(-9);
}

export const getCustomerFn = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.id,
    ]);
    return rows[0] ? mapCustomer(rows[0]) : null;
  });

export const listVisitsFn = createServerFn({ method: "GET" })
  .validator((data: { customerId: string }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    const [rows] = await pool.query<VisitRow[]>(
      "SELECT * FROM visits WHERE customer_id = ? ORDER BY date DESC",
      [data.customerId],
    );
    return rows.map(mapVisit);
  });

// Counts within the branch, not globally — branches have distinct prefixes
// (see settings.loyaltyPrefix) so this can't collide across branches even
// though each branch's numbering restarts independently.
async function nextLoyaltyId(prefix: string, branch: BranchCode): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM customers WHERE branch = ?",
    [branch],
  );
  const n = (rows[0]?.n as number) + 1;
  return `${prefix}${String(n).padStart(6, "0")}`;
}

export const registerCustomerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      branch: BranchCode;
      fullName: string;
      phone: string;
      email: string;
      gender?: string | null;
      notes?: string | null;
      initialSpend: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const [settingsRows] = await pool.query<SettingsRow[]>("SELECT * FROM settings WHERE branch = ?", [
      data.branch,
    ]);
    const settings = settingsRows[0];
    if (!settings) throw new Error("Loyalty settings are not configured yet for this branch");
    if (data.initialSpend < settings.minimum_spend) {
      throw new Error(`Customer must spend at least ${settings.minimum_spend}`);
    }

    // Global (not branch-scoped) — the same person showing up at a
    // different branch should never get a second loyalty ID and a second,
    // separate campaign. Point staff at the existing one instead.
    const [existingRows] = await pool.query<CustomerRow[]>("SELECT * FROM customers", []);
    const key = phoneKey(data.phone);
    const existing = key ? existingRows.find((r) => phoneKey(r.phone) === key) : undefined;
    if (existing) {
      const existingBranch = existing.branch === "LUSAKA" ? "Lusaka" : "Kitwe";
      throw new Error(
        `Already registered as ${existing.loyalty_id} (${existingBranch}) — search for them and record a visit instead.`,
      );
    }

    const id = randomUUID();
    const loyaltyId = await nextLoyaltyId(settings.loyalty_prefix, data.branch);
    const start = new Date();
    const end = new Date(start.getTime() + settings.campaign_duration * 86_400_000);

    await pool.query(
      `INSERT INTO customers
        (id, branch, loyalty_id, full_name, phone, email, gender, notes, disabled,
         visit_count, reward_claimed, reward_type, campaign_start, campaign_end, campaign_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, NULL, ?, ?, ?)`,
      [
        id,
        data.branch,
        loyaltyId,
        data.fullName,
        data.phone,
        data.email,
        data.gender ?? null,
        data.notes ?? null,
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        settings.campaign_duration,
      ],
    );

    await pool.query(
      `INSERT INTO visits (id, customer_id, branch, date, amount, staff_id, staff_name)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
      [randomUUID(), id, data.branch, data.initialSpend, staff.id, staff.fullName],
    );

    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [id]);
    const customer = mapCustomer(rows[0]);

    // Fire-and-forget: don't let a WhatsApp outage block registration.
    sendRegistrationNotifications({
      customerName: customer.fullName,
      phone: customer.phone,
      loyaltyId: customer.loyaltyId,
      branchName: settings.restaurant_name,
      rewardVisit: settings.reward_visit,
      campaignDuration: settings.campaign_duration,
    }).catch((err) => console.error("[whatsapp] loyalty notification failed", err));

    return customer;
  });

export const addVisitFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; amount: number }) => data)
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    const customer = rows[0];
    if (!customer) throw new Error("Customer not found");
    if (customer.reward_claimed) throw new Error("This customer already claimed their reward");

    // Minimum spend is that customer's own branch's rule, not whichever
    // branch the staff member currently happens to have selected.
    const [settingsRows] = await pool.query<SettingsRow[]>("SELECT * FROM settings WHERE branch = ?", [
      customer.branch,
    ]);
    const settings = settingsRows[0];
    if (!settings) throw new Error("Loyalty settings are not configured yet for this branch");
    if (data.amount < settings.minimum_spend) {
      throw new Error(`Minimum spend is ${settings.minimum_spend}`);
    }

    // Where the visit is actually happening right now (the staff member's
    // selected branch) — not necessarily the customer's home branch. This
    // is how a Lusaka-registered customer eating at Kitwe still shows up
    // as one continuous campaign: same customer row, same visit_count,
    // just a visit tagged to a different branch.
    const visitBranch = getSelectedBranch();

    await pool.query(
      `INSERT INTO visits (id, customer_id, branch, date, amount, staff_id, staff_name)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
      [randomUUID(), data.customerId, visitBranch, data.amount, staff.id, staff.fullName],
    );
    await pool.query("UPDATE customers SET visit_count = visit_count + 1 WHERE id = ?", [
      data.customerId,
    ]);

    const [updated] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    return mapCustomer(updated[0]);
  });

export const claimRewardFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; rewardType: string }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    await pool.query(
      "UPDATE customers SET reward_claimed = 1, reward_type = ? WHERE id = ?",
      [data.rewardType, data.customerId],
    );
    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    return mapCustomer(rows[0]);
  });

export const resetCampaignFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string }) => data)
  .handler(async ({ data }) => {
    await requireManager();
    const [customerRows] = await pool.query<CustomerRow[]>(
      "SELECT branch FROM customers WHERE id = ?",
      [data.customerId],
    );
    const customerBranch = customerRows[0]?.branch;
    if (!customerBranch) throw new Error("Customer not found");
    const [settingsRows] = await pool.query<SettingsRow[]>("SELECT * FROM settings WHERE branch = ?", [
      customerBranch,
    ]);
    const settings = settingsRows[0];
    const start = new Date();
    const end = new Date(start.getTime() + (settings?.campaign_duration ?? 30) * 86_400_000);
    await pool.query(
      `UPDATE customers
       SET visit_count = 0, reward_claimed = 0, reward_type = NULL,
           campaign_start = ?, campaign_end = ?, campaign_duration = ?, disabled = 0
       WHERE id = ?`,
      [
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        settings?.campaign_duration ?? 30,
        data.customerId,
      ],
    );
    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    return mapCustomer(rows[0]);
  });

export const extendCampaignFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; days?: number }) => data)
  .handler(async ({ data }) => {
    await requireManager();
    await pool.query(
      "UPDATE customers SET campaign_end = DATE_ADD(campaign_end, INTERVAL ? DAY) WHERE id = ?",
      [data.days ?? 30, data.customerId],
    );
    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    return mapCustomer(rows[0]);
  });

export const setCampaignEndFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; campaignEnd: string }) => data)
  .handler(async ({ data }) => {
    await requireManager();
    const [rows] = await pool.query<CustomerRow[]>(
      "SELECT campaign_start FROM customers WHERE id = ?",
      [data.customerId],
    );
    const row = rows[0];
    if (!row) throw new Error("Customer not found");

    const start = new Date(row.campaign_start);
    const end = new Date(data.campaignEnd);
    if (Number.isNaN(end.getTime())) throw new Error("Invalid date");
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));

    await pool.query(
      "UPDATE customers SET campaign_end = ?, campaign_duration = ? WHERE id = ?",
      [data.campaignEnd, duration, data.customerId],
    );
    const [updated] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    return mapCustomer(updated[0]);
  });

export const disableCustomerFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string }) => data)
  .handler(async ({ data }) => {
    await requireManager();
    await pool.query("UPDATE customers SET disabled = 1 WHERE id = ?", [data.customerId]);
    const [rows] = await pool.query<CustomerRow[]>("SELECT * FROM customers WHERE id = ?", [
      data.customerId,
    ]);
    return mapCustomer(rows[0]);
  });

export const getDashboardDataFn = createServerFn({ method: "GET" })
  .validator((data: { branch: BranchCode }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    const [customerRows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM customers WHERE branch = ? ORDER BY created_at DESC",
      [data.branch],
    );
    // Visits are counted by where they actually happened (v.branch), not
    // the visiting customer's home branch — a Lusaka customer eating at
    // Kitwe today should show up in Kitwe's "visits today", not Lusaka's.
    const [visitRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM visits v WHERE v.branch = ? AND DATE(v.date) = CURDATE()",
      [data.branch],
    );
    const [settingsRows] = await pool.query<SettingsRow[]>("SELECT * FROM settings WHERE branch = ?", [
      data.branch,
    ]);
    const settingsRow = settingsRows[0];
    const [optionRows] = await pool.query<RowDataPacket[]>(
      "SELECT label FROM reward_options WHERE branch = ? ORDER BY sort_order ASC",
      [data.branch],
    );

    return {
      customers: customerRows.map(mapCustomer),
      visitsToday: visitRows[0]?.n ?? 0,
      settings: settingsRow
        ? mapSettings(settingsRow, optionRows.map((r) => r.label as string))
        : null,
    };
  });

export const getReportsDataFn = createServerFn({ method: "GET" })
  .validator((data: { branch: BranchCode }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    const [customerRows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM customers WHERE branch = ? ORDER BY created_at DESC",
      [data.branch],
    );
    // Revenue/visit totals are attributed to where the visit actually
    // happened (v.branch), not the customer's home branch — a customer
    // registered at Lusaka who spends at Kitwe counts as Kitwe revenue.
    const [totals] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(v.amount), 0) AS total, COUNT(*) AS n FROM visits v WHERE v.branch = ?",
      [data.branch],
    );
    // Bucket visits into 12 trailing 7-day windows (bucket 11 = this week).
    const [weekly] = await pool.query<RowDataPacket[]>(
      `SELECT FLOOR(DATEDIFF(CURDATE(), v.date) / 7) AS bucket, COUNT(*) AS n
       FROM visits v
       WHERE v.branch = ? AND v.date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
       GROUP BY bucket`,
      [data.branch],
    );
  const bucketMap = new Map(weekly.map((r) => [Number(r.bucket), Number(r.n)]));
  const weeklyVisits: number[] = [];
  for (let i = 11; i >= 0; i--) {
    weeklyVisits.push(bucketMap.get(i) ?? 0);
  }

  const totalRevenue = Number(totals[0]?.total ?? 0);
  const visitCount = Number(totals[0]?.n ?? 0);

  return {
    customers: customerRows.map(mapCustomer),
    totalRevenue,
    avgVisitSpend: visitCount ? Math.round(totalRevenue / visitCount) : 0,
    weeklyVisits,
  };
});

// ---------------------------------------------------------------- staff ----

export const listStaffFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const [rows] = await pool.query<StaffRow[]>("SELECT * FROM staff ORDER BY full_name ASC");
  return rows.map(mapStaff);
});

export const createStaffFn = createServerFn({ method: "POST" })
  .validator(
    (data: { fullName: string; username: string; password: string; role: "manager" | "staff" }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requireManager();
    const username = data.username.trim().toLowerCase();
    const [existing] = await pool.query<StaffRow[]>("SELECT id FROM staff WHERE username = ?", [
      username,
    ]);
    if (existing.length > 0) throw new Error("That username is already taken");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const id = randomUUID();
    await pool.query(
      `INSERT INTO staff (id, full_name, username, password_hash, role, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, data.fullName, username, passwordHash, data.role],
    );
    const [rows] = await pool.query<StaffRow[]>("SELECT * FROM staff WHERE id = ?", [id]);
    invalidateStaffCache();
    return mapStaff(rows[0]);
  });

export const updateStaffFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      fullName: string;
      role: "manager" | "staff";
      active: boolean;
      newPassword?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireManager();
    await pool.query(
      "UPDATE staff SET full_name = ?, role = ?, active = ? WHERE id = ?",
      [data.fullName, data.role, data.active ? 1 : 0, data.id],
    );
    if (data.newPassword) {
      const passwordHash = await bcrypt.hash(data.newPassword, 10);
      await pool.query("UPDATE staff SET password_hash = ? WHERE id = ?", [
        passwordHash,
        data.id,
      ]);
    }
    const [rows] = await pool.query<StaffRow[]>("SELECT * FROM staff WHERE id = ?", [data.id]);
    invalidateStaffCache();
    return mapStaff(rows[0]);
  });

// ------------------------------------------------------------ settings ----

async function loadSettings(branch: BranchCode): Promise<Settings> {
  const [rows] = await pool.query<SettingsRow[]>("SELECT * FROM settings WHERE branch = ?", [branch]);
  const row = rows[0];
  if (!row) throw new Error("Loyalty settings are not configured yet for this branch");
  const [optionRows] = await pool.query<RowDataPacket[]>(
    "SELECT label FROM reward_options WHERE branch = ? ORDER BY sort_order ASC",
    [branch],
  );
  return mapSettings(
    row,
    optionRows.map((r) => r.label as string),
  );
}

export const getSettingsFn = createServerFn({ method: "GET" })
  .validator((data: { branch: BranchCode }) => data)
  .handler(async ({ data }) => {
    await requireStaff();
    return loadSettings(data.branch);
  });

export const updateSettingsFn = createServerFn({ method: "POST" })
  .validator((data: Settings) => data)
  .handler(async ({ data }) => {
    await requireManager();
    await pool.query(
      `UPDATE settings SET
         restaurant_name = ?, loyalty_prefix = ?, currency = ?, enabled = ?,
         minimum_spend = ?, campaign_duration = ?, required_visits = ?, reward_visit = ?
       WHERE branch = ?`,
      [
        data.restaurantName,
        data.loyaltyPrefix,
        data.currency,
        data.enabled ? 1 : 0,
        data.minimumSpend,
        data.campaignDuration,
        data.requiredVisits,
        data.rewardVisit,
        data.branch,
      ],
    );

    await pool.query("DELETE FROM reward_options WHERE branch = ?", [data.branch]);
    if (data.rewardOptions.length > 0) {
      const values = data.rewardOptions.map((label, i) => [randomUUID(), data.branch, label, i]);
      await pool.query("INSERT INTO reward_options (id, branch, label, sort_order) VALUES ?", [values]);
    }

    return loadSettings(data.branch);
  });

export type { Customer };
