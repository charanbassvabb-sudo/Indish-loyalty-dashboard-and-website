import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { setBranchFn } from "@/lib/functions";
import { BRANCHES } from "@/lib/types";
import type { BranchCode } from "@/lib/types";

/**
 * Switches which branch's data every page on the site reads/writes.
 * Persists via a cookie (see branch.server.ts) so it survives reloads and is
 * available server-side to loaders — not just this component's own state.
 */
export function BranchSwitcher({ branch }: { branch: BranchCode }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function switchTo(next: BranchCode) {
    if (next === branch || switching) return;
    setSwitching(true);
    try {
      await setBranchFn({ data: { branch: next } });
      await router.invalidate();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border p-1">
      <MapPin className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
      {BRANCHES.map((b) => (
        <button
          key={b.code}
          onClick={() => switchTo(b.code)}
          disabled={switching}
          className={`rounded px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
            branch === b.code
              ? "bg-gold-gradient text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
