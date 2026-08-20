import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, UserPlus } from "lucide-react";
import { listCustomersFn, getSettingsFn } from "@/lib/functions";
import { daysRemaining, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "Customers — Indish Loyalty" }] }),
  loader: async ({ context }) => {
    const [customers, settings] = await Promise.all([
      listCustomersFn({ data: { branch: context.branch } }),
      getSettingsFn({ data: { branch: context.branch } }),
    ]);
    return { customers, settings };
  },
  component: CustomersPage,
});

const statusColors: Record<string, string> = {
  active: "border-success/40 text-success",
  completed: "border-gold/40 text-gold",
  expired: "border-destructive/40 text-destructive",
  disabled: "border-muted-foreground/40 text-muted-foreground",
};

function CustomersPage() {
  const { customers, settings } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "expired" | "completed">("all");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (tab !== "all" && c.status !== tab) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(s) ||
        c.loyaltyId.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.email.toLowerCase().includes(s)
      );
    });
  }, [customers, q, tab]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Loyalty members
          </p>
          <h1 className="font-display text-4xl text-gold">Customers</h1>
        </div>
        <Button
          asChild
          className="btn-shine bg-gold-gradient text-primary-foreground hover:opacity-90"
        >
          <Link to="/register">
            <UserPlus className="mr-2 h-4 w-4" /> Register customer
          </Link>
        </Button>
      </motion.header>

      <Card className="border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by loyalty ID, name, phone, or email…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(["all", "active", "expired", "completed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative rounded px-3 py-1 text-xs capitalize transition-colors ${
                  tab === t
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === t && (
                  <motion.span
                    layoutId="customer-tab-pill"
                    className="absolute inset-0 rounded bg-gold-gradient"
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="relative z-10">{t}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Loyalty ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Ends</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  className="transition-colors hover:bg-accent/30"
                >
                  <td className="px-4 py-3 font-mono text-gold">{c.loyaltyId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.fullName}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (c.visitCount / settings.rewardVisit) * 100)}%`,
                          }}
                          transition={{
                            delay: Math.min(i, 20) * 0.02 + 0.1,
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="h-full bg-gold-gradient"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {c.visitCount}/{settings.rewardVisit}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(c.campaignEnd)}
                    <div className="text-xs">
                      {c.status === "active" ? `${daysRemaining(c.campaignEnd)}d left` : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[c.status]}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/customers/$id" params={{ id: c.id }}>
                        View
                      </Link>
                    </Button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No customers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
