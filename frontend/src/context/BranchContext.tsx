import { createContext, useContext, useState, type ReactNode } from "react";
import type { BranchId } from "@/types";

interface BranchContextValue {
  selectedBranch: BranchId | null;
  setSelectedBranch: (branch: BranchId) => void;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

const STORAGE_KEY = "indish.selected-branch";

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<BranchId | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return stored === "lusaka" || stored === "kitwe" ? stored : null;
  });

  function setSelectedBranch(branch: BranchId) {
    setSelectedBranchState(branch);
    window.sessionStorage.setItem(STORAGE_KEY, branch);
  }

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within a BranchProvider");
  return ctx;
}
