export type CustomerStatus = "active" | "completed" | "expired" | "disabled";
export type StaffRole = "manager" | "staff";
export type BranchCode = "LUSAKA" | "KITWE";

export const BRANCHES: { code: BranchCode; label: string }[] = [
  { code: "LUSAKA", label: "Lusaka" },
  { code: "KITWE", label: "Kitwe" },
];

export type Customer = {
  id: string;
  branch: BranchCode;
  loyaltyId: string;
  fullName: string;
  phone: string;
  email: string;
  gender: string | null;
  notes: string | null;
  status: CustomerStatus;
  visitCount: number;
  rewardClaimed: boolean;
  rewardType: string | null;
  campaignStart: string;
  campaignEnd: string;
  campaignDuration: number;
};

export type Visit = {
  id: string;
  customerId: string;
  /** Branch this visit was physically recorded at — may differ from the customer's own home branch. */
  branch: BranchCode;
  date: string;
  amount: number;
  staffId: string | null;
  staffName: string;
};

export type Staff = {
  id: string;
  fullName: string;
  username: string;
  role: StaffRole;
  active: boolean;
};

export type Settings = {
  branch: BranchCode;
  restaurantName: string;
  loyaltyPrefix: string;
  currency: string;
  enabled: boolean;
  minimumSpend: number;
  campaignDuration: number;
  requiredVisits: number;
  rewardVisit: number;
  rewardOptions: string[];
};
