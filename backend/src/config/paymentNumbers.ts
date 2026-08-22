/**
 * Business numbers customers send deposits to, per branch/provider — the
 * backend's source of truth for what a screenshot's recipient number is
 * checked against. Mirrors PAYMENT_PROVIDERS_BY_BRANCH in the frontend
 * (src/data/reservation.ts); keep both in sync if either changes.
 *
 * Lusaka: Airtel Money only (client-confirmed). Kitwe: Airtel Money + MTN
 * MoMo, both agent tills as of 2026-08-23 (Panda Rahul / Indish Friends
 * respectively — see the frontend copy for the isAgentNumber flag that
 * drives the "Get Cash" vs "Send Money" instructions). Zamtel Kwacha
 * dropped — not carried forward to this verified flow.
 */
import type { BranchCode } from "@prisma/client";

export type SupportedProvider = "AIRTEL_MONEY" | "MTN_MOMO";

export const PAYMENT_NUMBERS_BY_BRANCH: Record<BranchCode, Partial<Record<SupportedProvider, string>>> = {
  LUSAKA: {
    AIRTEL_MONEY: "0979771033",
  },
  KITWE: {
    AIRTEL_MONEY: "0973371166",
    MTN_MOMO: "0767393454",
  },
};

export function getBusinessNumber(branch: BranchCode, provider: SupportedProvider): string | null {
  return PAYMENT_NUMBERS_BY_BRANCH[branch][provider] ?? null;
}

export function isProviderAllowedForBranch(branch: BranchCode, provider: string): provider is SupportedProvider {
  return Boolean(PAYMENT_NUMBERS_BY_BRANCH[branch][provider as SupportedProvider]);
}
