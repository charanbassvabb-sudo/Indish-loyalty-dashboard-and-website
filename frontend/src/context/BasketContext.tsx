import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { BranchId } from "@/types";

export type SpiceLevel = "MILD" | "MEDIUM" | "HOT";

export interface BasketLine {
  /** Unique per menuItemId+variant+spice combo, so adding the same combo twice bumps quantity instead of duplicating a row. */
  key: string;
  menuItemId: string;
  nameSnapshot: string;
  priceVariantLabel: string | null;
  unitPrice: number;
  quantity: number;
  spiceLevel: SpiceLevel | null;
  imageUrl?: string;
}

export interface AddLineInput {
  menuItemId: string;
  nameSnapshot: string;
  priceVariantLabel?: string | null;
  unitPrice: number;
  spiceLevel?: SpiceLevel | null;
  imageUrl?: string;
  quantity?: number;
}

interface BasketContextValue {
  /** Which branch the current basket's items belong to — null when empty. */
  branchId: BranchId | null;
  lines: BasketLine[];
  subtotal: number;
  itemCount: number;
  /** Adds/merges a line for the given branch. Only call this once the basket is confirmed to be for that branch (see TakeawayBrowseMenuStep's branch-mismatch guard) — it doesn't itself warn about switching branches. */
  addLine: (input: AddLineInput, branchId: BranchId) => void;
  updateLineQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearBasket: () => void;
  /** Explicitly switches the basket to a branch, clearing any existing lines if it's a different branch. A no-op if already on that branch. */
  setBranch: (branchId: BranchId) => void;
}

const BasketContext = createContext<BasketContextValue | undefined>(undefined);

// Persisted to localStorage (not sessionStorage, unlike BranchContext) —
// losing a half-built takeaway basket to an accidental tab close or refresh
// would be a much more frustrating loss than losing a selected branch.
const STORAGE_KEY = "indish.takeaway-basket";

interface StoredBasket {
  branchId: BranchId | null;
  lines: BasketLine[];
}

function lineKey(menuItemId: string, priceVariantLabel: string | null, spiceLevel: SpiceLevel | null) {
  return `${menuItemId}::${priceVariantLabel ?? ""}::${spiceLevel ?? ""}`;
}

function loadStored(): StoredBasket {
  if (typeof window === "undefined") return { branchId: null, lines: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { branchId: null, lines: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.lines)) return { branchId: null, lines: [] };
    return { branchId: parsed.branchId ?? null, lines: parsed.lines };
  } catch {
    return { branchId: null, lines: [] };
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchId] = useState<BranchId | null>(() => loadStored().branchId);
  const [lines, setLines] = useState<BasketLine[]>(() => loadStored().lines);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ branchId, lines }));
    } catch {
      // Private browsing / full storage — losing basket persistence isn't worth crashing the page over.
    }
  }, [branchId, lines]);

  function addLine(input: AddLineInput, branch: BranchId) {
    const spiceLevel = input.spiceLevel ?? null;
    const priceVariantLabel = input.priceVariantLabel ?? null;
    const key = lineKey(input.menuItemId, priceVariantLabel, spiceLevel);
    const qty = input.quantity ?? 1;

    setBranchId(branch);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [
        ...prev,
        {
          key,
          menuItemId: input.menuItemId,
          nameSnapshot: input.nameSnapshot,
          priceVariantLabel,
          unitPrice: input.unitPrice,
          quantity: qty,
          spiceLevel,
          imageUrl: input.imageUrl,
        },
      ];
    });
  }

  function updateLineQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      removeLine(key);
      return;
    }
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function clearBasket() {
    setLines([]);
  }

  function setBranch(branch: BranchId) {
    if (branch !== branchId) {
      setBranchId(branch);
      setLines([]);
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <BasketContext.Provider
      value={{ branchId, lines, subtotal, itemCount, addLine, updateLineQuantity, removeLine, clearBasket, setBranch }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within a BasketProvider");
  return ctx;
}
