import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { listAllCustomersFn, getSettingsFn } from "@/lib/functions";
import { daysRemaining } from "@/lib/format";
import { BRANCHES, type BranchCode, type Settings } from "@/lib/types";

export const Route = createFileRoute("/_app/search")({
  head: () => ({ meta: [{ title: "Search — Indish Loyalty" }] }),
  // Lets the restaurant admin deep-link here with a phone number, e.g.
  // /search?q=0977123456 — see "View loyalty profile" in ReservationEditDrawer.tsx.
  // Optional, so existing plain `<Link to="/search">` usages elsewhere still typecheck.
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  // Deliberately searches ALL branches, not just the one currently selected
  // — this is the tool staff use to recognize a customer who registered
  // elsewhere (e.g. Lusaka) and is now walking into this branch (e.g.
  // Kitwe), so their existing campaign gets found instead of them being
  // re-registered from scratch. Settings are loaded per-branch since a
  // result's reward threshold depends on THEIR branch, not the viewer's.
  loader: async () => {
    const [customers, lusaka, kitwe] = await Promise.all([
      listAllCustomersFn(),
      getSettingsFn({ data: { branch: "LUSAKA" } }),
      getSettingsFn({ data: { branch: "KITWE" } }),
    ]);
    const settingsByBranch: Record<BranchCode, Settings> = { LUSAKA: lusaka, KITWE: kitwe };
    return { customers, settingsByBranch };
  },
  component: SearchPage,
});

function SearchPage() {
  const { customers, settingsByBranch } = Route.useLoaderData();
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(s) ||
        c.loyaltyId.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.email.toLowerCase().includes(s),
    );
  }, [customers, q]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Instant lookup</p>
        <h1 className="font-display text-4xl text-gold">Quick Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search by loyalty ID, name, phone, or email.</p>
      </header>

      <Card className="border-border/60 bg-card p-2 shadow-elegant">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Start typing…"
            className="h-14 border-0 bg-transparent pl-12 font-display text-xl placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>
      </Card>

      {q && (
        <div className="text-xs text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"}
        </div>
      )}

      <div className="space-y-2">
        {results.map((c) => (
          <Link
            key={c.id}
            to="/customers/$id"
            params={{ id: c.id }}
            className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4 transition hover:border-gold/50 hover:shadow-gold"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient font-semibold text-primary-foreground">
              {c.fullName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{c.fullName}</span>
                <Badge variant="outline" className="border-gold/40 font-mono text-xs text-gold">
                  {c.loyaltyId}
                </Badge>
                <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
                  {BRANCHES.find((b) => b.code === c.branch)?.label ?? c.branch}
                </Badge>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {c.phone} · {c.email}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-gold">
                {c.visitCount}/{settingsByBranch[c.branch].rewardVisit}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.status === "active" ? `${daysRemaining(c.campaignEnd)}d left` : c.status}
              </div>
            </div>
          </Link>
        ))}
        {q && results.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No customers match "<span className="text-foreground">{q}</span>".
          </div>
        )}
      </div>
    </div>
  );
}
