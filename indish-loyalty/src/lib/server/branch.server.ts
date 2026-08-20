import { getCookie } from "@tanstack/react-start/server";
import type { BranchCode } from "@/lib/types";

export const BRANCH_COOKIE = "indish_branch";
export const BRANCH_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year — a staff pick, not a secret

/** Reads the currently-selected branch from its cookie; defaults to LUSAKA if unset/invalid. */
export function getSelectedBranch(): BranchCode {
  const raw = getCookie(BRANCH_COOKIE);
  return raw === "KITWE" ? "KITWE" : "LUSAKA";
}
