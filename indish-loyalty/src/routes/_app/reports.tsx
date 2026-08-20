import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReportsDataFn } from "@/lib/functions";
import { formatK } from "@/lib/format";
import { Download, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Indish Loyalty" }] }),
  loader: ({ context }) => getReportsDataFn({ data: { branch: context.branch } }),
  component: ReportsPage,
});

function ReportsPage() {
  const { customers, totalRevenue, avgVisitSpend, weeklyVisits } = Route.useLoaderData();
  const maxWeekly = Math.max(1, ...weeklyVisits);

  function exportCsv() {
    const header = ["Customer", "Visits", "Reward", "Status"];
    const rows = customers.map((c) => [c.fullName, c.visitCount, c.rewardType ?? "", c.status]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "indish-loyalty-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Insights</p>
          <h1 className="font-display text-4xl text-gold">Reports</h1>
        </div>
        <Button variant="outline" onClick={exportCsv} className="btn-shine">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </motion.header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Qualifying revenue tracked" value={formatK(totalRevenue)} index={0} />
        <Metric label="Average visit spend" value={formatK(avgVisitSpend)} index={1} />
        <Metric label="Loyalty members" value={customers.length} index={2} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="border-border/60 bg-card p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <h2 className="font-display text-2xl">Visit volume</h2>
          </div>
          <div className="mt-6 flex h-48 items-end gap-2">
            {weeklyVisits.map((v, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (v / maxWeekly) * 100)}%` }}
                transition={{ delay: 0.3 + i * 0.03, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 rounded-t bg-gold-gradient/70"
                title={`${v} visits`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>12 weeks ago</span>
            <span>This week</span>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden border-border/60 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 20) * 0.02 }}
                    className="transition-colors hover:bg-accent/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3">{c.fullName}</td>
                    <td className="px-4 py-3 text-gold">{c.visitCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{c.rewardType ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{c.status}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function Metric({ label, value, index }: { label: string; value: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card className="border-border/60 bg-card p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-3 font-display text-3xl text-gold">{value}</p>
      </Card>
    </motion.div>
  );
}
