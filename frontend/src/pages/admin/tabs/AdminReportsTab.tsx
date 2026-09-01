import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CalendarDays,
  Users,
  TrendingUp,
  PartyPopper,
  TrendingDown,
  Minus,
  ShoppingBag,
  Wallet,
  UtensilsCrossed,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useTiltSpotlight } from "@/hooks/useTiltSpotlight";
import { useToast } from "@/context/ToastContext";
import type { ReportsSummary } from "@/types/admin";

const RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const BRANCHES = [
  { label: "All branches", value: "" },
  { label: "Lusaka", value: "LUSAKA" },
  { label: "Kitwe", value: "KITWE" },
] as const;

const ORDER_TYPES = [
  { label: "All orders", value: "" },
  { label: "Reservations", value: "RESERVATION" },
  { label: "Takeaway", value: "TAKEAWAY" },
  { label: "Catering", value: "CATERING" },
] as const;

const PAYMENT_METHODS = [
  { label: "All methods", value: "" },
  { label: "Airtel Money", value: "AIRTEL_MONEY" },
  { label: "MTN MoMo", value: "MTN_MOMO" },
] as const;

const cardDefs = [
  { key: "todaysReservations", label: "Today's reservations", icon: CalendarDays },
  { key: "todaysCovers", label: "Today's covers", icon: Users },
  { key: "averagePartySize", label: "Avg. party size", icon: TrendingUp },
  { key: "partyBookings", label: "Party / family bookings", icon: PartyPopper },
] as const;

const takeawayCardDefs = [
  { key: "totalTakeawayOrders", label: "Takeaway orders", icon: ShoppingBag },
  { key: "totalTakeawayRevenue", label: "Takeaway revenue (ZMW)", icon: Wallet },
  { key: "totalCateringEnquiries", label: "Catering enquiries", icon: UtensilsCrossed },
  { key: "totalDiscountsApplied", label: "Discounts applied", icon: Tag },
] as const;

export function AdminReportsTab() {
  const { toast } = useToast();
  const [branch, setBranch] = useState<"" | "LUSAKA" | "KITWE">("");
  const [days, setDays] = useState(30);
  const [orderType, setOrderType] = useState<"" | "RESERVATION" | "TAKEAWAY" | "CATERING">("");
  const [paymentMethod, setPaymentMethod] = useState<"" | "AIRTEL_MONEY" | "MTN_MOMO">("");
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ days: String(days) });
    if (branch) params.set("branch", branch);
    if (orderType) params.set("orderType", orderType);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    setLoading(true);
    api
      .get<ReportsSummary>(`/admin/reports/summary?${params}`)
      .then(setData)
      .catch(() => toast({ title: "Couldn't load reports", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }, [branch, days, orderType, paymentMethod, toast]);

  // Honest trend read on the actual series returned — first half of the
  // range vs the second half — rather than fabricating a comparison.
  const trend = useMemo(() => {
    const series = data?.series ?? [];
    if (series.length < 4) return null;
    const mid = Math.floor(series.length / 2);
    const avg = (rows: typeof series) => rows.reduce((s, r) => s + r.reservations, 0) / rows.length;
    const firstAvg = avg(series.slice(0, mid));
    const secondAvg = avg(series.slice(mid));
    if (firstAvg === 0) return null;
    const pct = ((secondAvg - firstAvg) / firstAvg) * 100;
    return pct;
  }, [data]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PillSelect value={branch} onChange={setBranch} options={BRANCHES} groupId="admin-branch-pill" />
        <PillSelect value={days} onChange={setDays} options={RANGES} groupId="admin-range-pill" />
        <PillSelect value={orderType} onChange={setOrderType} options={ORDER_TYPES} groupId="admin-ordertype-pill" />
        <PillSelect value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} groupId="admin-paymentmethod-pill" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data
          ? cardDefs.map((c) => (
              <div key={c.key} className="card-warm p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <c.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{c.label}</span>
                </div>
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))
          : cardDefs.map((c, i) => <StatCard key={c.key} def={c} value={data.totals[c.key]} index={i} />)}
      </div>

      <div className="card-warm p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl text-foreground">Reservations per day</h3>
          {trend !== null && (
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                trend > 2
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : trend < -2
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground"
              }`}
            >
              {trend > 2 ? <TrendingUp className="h-3.5 w-3.5" /> : trend < -2 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              {trend > 0 ? "+" : ""}
              {trend.toFixed(0)}% vs earlier in range
            </span>
          )}
        </div>
        <div className="h-72 w-full">
          {loading ? (
            <div className="flex h-full flex-col justify-end gap-2 px-2 pb-2">
              <div className="flex h-full items-end gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
                ))}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series ?? []} margin={{ left: -20, right: 12, top: 10 }}>
                <defs>
                  <linearGradient id="reservationsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.19 264)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.62 0.19 264)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="reservationsStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.62 0.19 264)" />
                    <stop offset="100%" stopColor="oklch(0.78 0.12 85)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.31 0.028 264)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="reservations"
                  stroke="url(#reservationsStroke)"
                  strokeWidth={2.5}
                  fill="url(#reservationsFill)"
                  name="Reservations"
                  activeDot={{ r: 5, stroke: "oklch(0.78 0.12 85)", strokeWidth: 2, fill: "oklch(0.62 0.19 264)" }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatLine label="Total covers in range" value={data.totals.totalCovers} tone="default" />
          <StatLine label="Cancelled" value={data.totals.cancelled} tone="destructive" />
          <StatLine label="No-shows" value={data.totals.noShow} tone="muted" />
        </div>
      )}

      <div className="mb-6 mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data
          ? takeawayCardDefs.map((c) => (
              <div key={c.key} className="card-warm p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <c.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{c.label}</span>
                </div>
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))
          : takeawayCardDefs.map((c, i) => <StatCard key={c.key} def={c} value={data.totals[c.key]} index={i} />)}
      </div>

      <div className="card-warm p-6">
        <h3 className="mb-4 font-display text-xl text-foreground">Takeaway orders &amp; revenue per day</h3>
        <div className="h-64 w-full">
          {loading ? (
            <div className="flex h-full flex-col justify-end gap-2 px-2 pb-2">
              <div className="flex h-full items-end gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${25 + ((i * 31) % 55)}%` }} />
                ))}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.takeawaySeries ?? []} margin={{ left: -20, right: 12, top: 10 }}>
                <defs>
                  <linearGradient id="takeawayFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.12 85)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.78 0.12 85)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.31 0.028 264)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TakeawayTooltip />} />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="oklch(0.78 0.12 85)"
                  strokeWidth={2.5}
                  fill="url(#takeawayFill)"
                  name="Orders"
                  activeDot={{ r: 5, stroke: "oklch(0.78 0.12 85)", strokeWidth: 2, fill: "oklch(0.62 0.19 264)" }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card-warm p-6">
            <h3 className="mb-4 font-display text-lg text-foreground">Orders by branch</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { branch: "Lusaka", orders: data.totals.ordersByBranch.LUSAKA },
                    { branch: "Kitwe", orders: data.totals.ordersByBranch.KITWE },
                  ]}
                  margin={{ left: -20, right: 12, top: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.31 0.028 264)" vertical={false} />
                  <XAxis dataKey="branch" tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip suffix=" orders" />} />
                  <Bar dataKey="orders" fill="oklch(0.62 0.19 264)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-warm p-6">
            <h3 className="mb-4 font-display text-lg text-foreground">Takeaway revenue by payment method</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { method: "Airtel Money", revenue: data.totals.revenueByPaymentMethod.AIRTEL_MONEY },
                    { method: "MTN MoMo", revenue: data.totals.revenueByPaymentMethod.MTN_MOMO },
                  ]}
                  margin={{ left: -20, right: 12, top: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.31 0.028 264)" vertical={false} />
                  <XAxis dataKey="method" tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.68 0.025 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip prefix="ZMW " />} />
                  <Bar dataKey="revenue" fill="oklch(0.78 0.12 85)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="mt-6">
          <StatLine label="Total discount amount given (ZMW)" value={data.totals.totalDiscountAmount} tone="default" />
        </div>
      )}
    </div>
  );
}

const DECIMAL_STAT_KEYS = new Set(["averagePartySize", "totalTakeawayRevenue", "totalDiscountAmount"]);

function StatCard({
  def,
  value,
  index,
}: {
  def: { key: string; label: string; icon: typeof CalendarDays };
  value: number;
  index: number;
}) {
  const tilt = useTiltSpotlight<HTMLDivElement>({ max: 5 });
  const decimals = DECIMAL_STAT_KEYS.has(def.key) ? (def.key === "averagePartySize" ? 1 : 2) : 0;

  return (
    <motion.div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={tilt.style}
      className="card-warm spotlight-card relative overflow-hidden p-5"
    >
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-ember" aria-hidden />
      <div className="relative z-10 flex items-center gap-2 text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-ember/15 text-primary">
          <def.icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">{def.label}</span>
      </div>
      <p className="relative z-10 mt-3 font-display text-3xl text-foreground">
        <AnimatedCounter value={value} decimals={decimals} />
      </p>
    </motion.div>
  );
}

function StatLine({ label, value, tone }: { label: string; value: number; tone: "default" | "destructive" | "muted" }) {
  const toneClass =
    tone === "destructive" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="card-warm flex items-center justify-between p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-display text-lg ${toneClass}`}>
        <AnimatedCounter value={value} duration={1} />
      </span>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = " reservations",
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-primary">
        {prefix}
        {payload[0].value}
        {suffix}
      </p>
    </div>
  );
}

function TakeawayTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-primary">{payload[0].value} orders</p>
    </div>
  );
}

function PillSelect<T extends string | number>({
  value,
  onChange,
  options,
  groupId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { label: string; value: T }[];
  groupId: string;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-border bg-card p-1">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
            value === opt.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {value === opt.value && (
            <motion.span
              layoutId={groupId}
              className="absolute inset-0 rounded-full bg-gradient-ember"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
