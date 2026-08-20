import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { useTiltSpotlight } from "@/hooks/use-tilt-spotlight";
import {
  Users,
  Activity,
  Gift,
  Clock,
  TrendingUp,
  UserPlus,
  Search,
  ArrowRight,
} from "lucide-react";
import { getDashboardDataFn } from "@/lib/functions";
import { formatK, daysRemaining, formatDate } from "@/lib/format";
import type { ComponentType } from "react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Indish Loyalty" }] }),
  loader: ({ context }) => getDashboardDataFn({ data: { branch: context.branch } }),
  component: Dashboard,
});

function Dashboard() {
  const { customers, visitsToday, settings } = Route.useLoaderData();
  if (!settings) return <SettingsMissing />;

  const active = customers.filter((c) => c.status === "active").length;
  const expired = customers.filter((c) => c.status === "expired").length;
  const claimed = customers.filter((c) => c.rewardClaimed).length;

  const stats = [
    { label: "Total Customers", value: customers.length, icon: Users, tone: "text-gold" },
    { label: "Active Campaigns", value: active, icon: Activity, tone: "text-success" },
    { label: "Rewards Claimed", value: claimed, icon: Gift, tone: "text-gold" },
    { label: "Expired Campaigns", value: expired, icon: Clock, tone: "text-destructive" },
  ];

  const nearReward = [...customers]
    .filter((c) => c.status === "active")
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-4xl text-gold">Loyalty Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings.restaurantName} · {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" /> Find customer
            </Link>
          </Button>
          <Button
            asChild
            className="btn-shine bg-gold-gradient text-primary-foreground hover:opacity-90"
          >
            <Link to="/register">
              <UserPlus className="mr-2 h-4 w-4" /> Register customer
            </Link>
          </Button>
        </div>
      </motion.header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} stat={s} index={i} />
        ))}
      </div>

      {/* Campaign summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2"
        >
          <Card className="border-border/60 bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Customers close to a reward</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/customers">
                  All customers <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 divide-y divide-border/60">
              {nearReward.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No active customers yet.
                </p>
              )}
              {nearReward.map((c, i) => {
                const pct = Math.min(100, (c.visitCount / settings.rewardVisit) * 100);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <Link
                      to="/customers/$id"
                      params={{ id: c.id }}
                      className="flex items-center gap-4 py-3 transition hover:bg-accent/30"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient font-semibold text-primary-foreground">
                        {c.fullName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{c.fullName}</p>
                          <Badge variant="outline" className="border-gold/40 text-xs text-gold">
                            {c.loyaltyId}
                          </Badge>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              delay: 0.4 + i * 0.05,
                              duration: 0.8,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="h-full bg-gold-gradient"
                          />
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">
                          {c.visitCount}/{settings.rewardVisit}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {daysRemaining(c.campaignEnd)}d left
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="border-border/60 bg-card p-6">
            <h2 className="font-display text-2xl">Today</h2>
            <div className="mt-4 space-y-4">
              <Row label="Visits logged" value={visitsToday} />
              <Row label="Minimum spend" value={formatK(settings.minimumSpend)} />
              <Row label="Reward on visit" value={`#${settings.rewardVisit}`} />
              <Row label="Campaign length" value={`${settings.campaignDuration} days`} />
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  stat,
  index,
}: {
  stat: { label: string; value: number; icon: ComponentType<{ className?: string }>; tone: string };
  index: number;
}) {
  const tilt = useTiltSpotlight<HTMLDivElement>({ max: 5 });

  return (
    <motion.div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      style={tilt.style}
      className="spotlight-card"
    >
      <Card className="relative overflow-hidden border-border/60 bg-card p-5 shadow-elegant">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gold-gradient" aria-hidden />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-3 font-display text-4xl">
              <AnimatedCounter value={stat.value} />
            </p>
          </div>
          <div className="rounded-md bg-accent/60 p-2">
            <stat.icon className={`h-5 w-5 ${stat.tone}`} />
          </div>
        </div>
        <div className="relative z-10 mt-4 flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-success" />
          <span>Live · updated just now</span>
        </div>
      </Card>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function SettingsMissing() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <h1 className="font-display text-2xl text-gold">Campaign settings not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Run <code className="text-gold">npm run db:setup</code> to initialize the database.
      </p>
    </div>
  );
}
