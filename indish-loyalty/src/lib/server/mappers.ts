import type { BranchCode, Customer, CustomerStatus, Settings, Staff, Visit } from "@/lib/types";
import type { RowDataPacket } from "mysql2";

export interface CustomerRow extends RowDataPacket {
  id: string;
  branch: BranchCode;
  loyalty_id: string;
  full_name: string;
  phone: string;
  email: string;
  gender: string | null;
  notes: string | null;
  disabled: number;
  visit_count: number;
  reward_claimed: number;
  reward_type: string | null;
  campaign_start: string;
  campaign_end: string;
  campaign_duration: number;
}

/** Status is derived, not stored, so it can never drift out of sync. */
export function deriveStatus(row: CustomerRow): CustomerStatus {
  if (row.disabled) return "disabled";
  if (row.reward_claimed) return "completed";
  if (new Date(row.campaign_end).getTime() < Date.now()) return "expired";
  return "active";
}

export function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    branch: row.branch,
    loyaltyId: row.loyalty_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    gender: row.gender,
    notes: row.notes,
    status: deriveStatus(row),
    visitCount: row.visit_count,
    rewardClaimed: !!row.reward_claimed,
    rewardType: row.reward_type,
    campaignStart: row.campaign_start,
    campaignEnd: row.campaign_end,
    campaignDuration: row.campaign_duration,
  };
}

export interface VisitRow extends RowDataPacket {
  id: string;
  customer_id: string;
  branch: BranchCode;
  date: string;
  amount: number;
  staff_id: string | null;
  staff_name: string;
}

export function mapVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    customerId: row.customer_id,
    branch: row.branch,
    date: row.date,
    amount: Number(row.amount),
    staffId: row.staff_id,
    staffName: row.staff_name,
  };
}

export interface StaffRow extends RowDataPacket {
  id: string;
  full_name: string;
  username: string;
  role: "manager" | "staff";
  active: number;
  password_hash: string;
}

export function mapStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    active: !!row.active,
  };
}

export interface SettingsRow extends RowDataPacket {
  branch: BranchCode;
  restaurant_name: string;
  loyalty_prefix: string;
  currency: string;
  enabled: number;
  minimum_spend: number;
  campaign_duration: number;
  required_visits: number;
  reward_visit: number;
}

export function mapSettings(row: SettingsRow, rewardOptions: string[]): Settings {
  return {
    branch: row.branch,
    restaurantName: row.restaurant_name,
    loyaltyPrefix: row.loyalty_prefix,
    currency: row.currency,
    enabled: !!row.enabled,
    minimumSpend: Number(row.minimum_spend),
    campaignDuration: row.campaign_duration,
    requiredVisits: row.required_visits,
    rewardVisit: row.reward_visit,
    rewardOptions,
  };
}
