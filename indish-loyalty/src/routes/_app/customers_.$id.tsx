import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Check, Gift, Plus, Calendar, Clock, Trophy, Phone, Mail, ExternalLink, Sparkles } from "lucide-react";
import { reservationsSearchUrl } from "@/lib/restaurant";
import {
  getCustomerFn,
  listVisitsFn,
  getSettingsFn,
  addVisitFn,
  claimRewardFn,
  resetCampaignFn,
  extendCampaignFn,
  setCampaignEndFn,
  disableCustomerFn,
} from "@/lib/functions";
import { BRANCHES } from "@/lib/types";
import { formatK, formatDate, daysRemaining } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers_/$id")({
  head: () => ({ meta: [{ title: "Customer — Indish Loyalty" }] }),
  loader: async ({ params }) => {
    const customer = await getCustomerFn({ data: { id: params.id } });
    if (!customer) throw notFound();
    // Settings reflect this customer's own branch, not whichever branch the
    // viewer currently has selected in the switcher (they may have arrived
    // via search results or a direct link from the other branch).
    const [settings, visits] = await Promise.all([
      getSettingsFn({ data: { branch: customer.branch } }),
      listVisitsFn({ data: { customerId: params.id } }),
    ]);
    return { customer, visits, settings };
  },
  component: CustomerPage,
});

function CustomerPage() {
  const { customer, visits, settings } = Route.useLoaderData();
  const { staff, branch: viewingBranch } = Route.useRouteContext();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reward, setReward] = useState(settings.rewardOptions[0] ?? "");
  const [openVisit, setOpenVisit] = useState(false);
  const [openReward, setOpenReward] = useState(false);
  const [busy, setBusy] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [newEndDate, setNewEndDate] = useState(customer.campaignEnd.slice(0, 10));

  const daysLeft = daysRemaining(customer.campaignEnd);
  const rewardReady = customer.visitCount >= settings.rewardVisit && !customer.rewardClaimed;

  async function addVisit() {
    const n = Number(amount);
    if (!n || n < settings.minimumSpend) {
      toast.error(`Minimum spend is ${formatK(settings.minimumSpend)}`);
      return;
    }
    setBusy(true);
    try {
      await addVisitFn({ data: { customerId: customer.id, amount: n } });
      toast.success(`Visit recorded — ${formatK(n)}`);
      setOpenVisit(false);
      setAmount("");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record visit");
    } finally {
      setBusy(false);
    }
  }

  async function claimReward() {
    setBusy(true);
    try {
      await claimRewardFn({ data: { customerId: customer.id, rewardType: reward } });
      toast.success(`${reward} reward claimed for ${customer.fullName}`);
      setOpenReward(false);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim reward");
    } finally {
      setBusy(false);
    }
  }

  async function managerAction(fn: () => Promise<unknown>, successMsg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {viewingBranch !== customer.branch && (
        <div className="flex items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-gold" />
          <span>
            Registered at{" "}
            <span className="font-medium text-gold">
              {BRANCHES.find((b) => b.code === customer.branch)?.label ?? customer.branch}
            </span>
            , visiting {BRANCHES.find((b) => b.code === viewingBranch)?.label ?? viewingBranch} — any
            visit recorded here continues their same campaign, not a new one.
          </span>
        </div>
      )}

      {/* Hero */}
      <Card className="relative overflow-hidden border-border/60 bg-noir p-8 shadow-elegant">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient font-display text-2xl text-primary-foreground shadow-gold">
              {customer.fullName[0]}
            </div>
            <div>
              <h1 className="font-display text-3xl text-gold">{customer.fullName}</h1>
              <p className="font-mono text-sm text-muted-foreground">
                {customer.loyaltyId} · {BRANCHES.find((b) => b.code === customer.branch)?.label ?? customer.branch}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>
                <a
                  href={reservationsSearchUrl(customer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gold hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View reservations
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={openVisit} onOpenChange={setOpenVisit}>
              <DialogTrigger asChild>
                <Button
                  disabled={customer.status !== "active" || customer.rewardClaimed}
                  className="bg-gold-gradient text-primary-foreground hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add visit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record visit</DialogTitle>
                  <DialogDescription>
                    Minimum qualifying spend is <span className="text-gold">{formatK(settings.minimumSpend)}</span>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="amt">Amount spent (K)</Label>
                  <Input
                    id="amt"
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 620"
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpenVisit(false)}>Cancel</Button>
                  <Button onClick={addVisit} disabled={busy} className="bg-gold-gradient text-primary-foreground">
                    Confirm visit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={openReward} onOpenChange={setOpenReward}>
              <DialogTrigger asChild>
                <Button disabled={!rewardReady} variant="outline" className="border-gold/50 text-gold hover:bg-gold/10">
                  <Gift className="mr-2 h-4 w-4" /> Claim reward
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Claim reward</DialogTitle>
                  <DialogDescription>
                    Choose a reward for {customer.fullName}. This can only be done once.
                  </DialogDescription>
                </DialogHeader>
                <RadioGroup value={reward} onValueChange={setReward} className="space-y-2">
                  {settings.rewardOptions.map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:border-gold/50">
                      <RadioGroupItem value={r} id={r} />
                      <span>{r}</span>
                    </label>
                  ))}
                </RadioGroup>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpenReward(false)}>Cancel</Button>
                  <Button onClick={claimReward} disabled={busy} className="bg-gold-gradient text-primary-foreground">
                    Confirm claim
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Countdown + progress */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Visit progress</h2>
            <Badge variant="outline" className="border-gold/40 text-gold">
              {customer.visitCount} of {settings.rewardVisit}
            </Badge>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {Array.from({ length: settings.rewardVisit }).map((_, i) => {
              const filled = i < customer.visitCount;
              const rewardSlot = i === settings.rewardVisit - 1;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${
                      filled
                        ? "border-gold bg-gold-gradient text-primary-foreground shadow-gold"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {rewardSlot ? <Gift className="h-6 w-6" /> : filled ? <Check className="h-6 w-6" /> : i + 1}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {rewardSlot ? "Reward" : `Visit ${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>

          {customer.rewardClaimed && (
            <div className="mt-6 flex items-center gap-3 rounded-md border border-gold/40 bg-gold/10 p-4">
              <Trophy className="h-5 w-5 text-gold" />
              <div>
                <div className="font-medium text-gold">Reward claimed: {customer.rewardType}</div>
                <div className="text-xs text-muted-foreground">Congratulations to {customer.fullName}!</div>
              </div>
            </div>
          )}
        </Card>

        <Card className="border-border/60 bg-card p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" />
            <h2 className="font-display text-2xl">Countdown</h2>
          </div>
          <div className="mt-4 text-center">
            <div className="font-display text-6xl text-gold">{daysLeft}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">days remaining</div>
          </div>
          <div className="mt-6 space-y-2 border-t border-border/60 pt-4 text-sm">
            <RowInline icon={Calendar} label="Started" value={formatDate(customer.campaignStart)} />
            <RowInline icon={Calendar} label="Ends" value={formatDate(customer.campaignEnd)} />
            <RowInline icon={Clock} label="Duration" value={`${customer.campaignDuration} days`} />
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={
                customer.status === "active" ? "border-success/40 text-success" :
                customer.status === "completed" ? "border-gold/40 text-gold" :
                "border-destructive/40 text-destructive"
              }>
                {customer.status}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Visit history */}
      <Card className="border-border/60 bg-card p-6">
        <h2 className="font-display text-2xl">Visit history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2">Date</th>
                <th className="py-2">Branch</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Recorded by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visits.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No visits yet.</td></tr>
              )}
              {visits.map((v) => (
                <tr key={v.id}>
                  <td className="py-3">{formatDate(v.date)}</td>
                  <td className="py-3">
                    <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
                      {BRANCHES.find((b) => b.code === v.branch)?.label ?? v.branch}
                    </Badge>
                  </td>
                  <td className="py-3 text-gold">{formatK(v.amount)}</td>
                  <td className="py-3 text-muted-foreground">{v.staffName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {staff.role === "manager" && (
        <Card className="border-border/60 bg-card p-6">
          <h2 className="font-display text-2xl">Manager actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reset, extend, or disable this customer's campaign.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                managerAction(
                  () => resetCampaignFn({ data: { customerId: customer.id } }),
                  "Campaign reset",
                )
              }
            >
              Reset campaign
            </Button>

            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="extend-days" className="text-xs text-muted-foreground">
                  Extend by (days)
                </Label>
                <Input
                  id="extend-days"
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="w-24"
                />
              </div>
              <Button
                variant="outline"
                disabled={busy || !Number(extendDays)}
                onClick={() =>
                  managerAction(
                    () =>
                      extendCampaignFn({
                        data: { customerId: customer.id, days: Number(extendDays) },
                      }),
                    `Campaign extended by ${extendDays} days`,
                  )
                }
              >
                Extend
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="new-end-date" className="text-xs text-muted-foreground">
                  Set campaign end date
                </Label>
                <Input
                  id="new-end-date"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                variant="outline"
                disabled={busy || !newEndDate}
                onClick={() =>
                  managerAction(
                    () =>
                      setCampaignEndFn({
                        data: { customerId: customer.id, campaignEnd: newEndDate },
                      }),
                    "Campaign end date updated",
                  )
                }
              >
                Save date
              </Button>
            </div>

            <Button
              variant="outline"
              disabled={busy}
              className="text-destructive hover:text-destructive"
              onClick={() =>
                managerAction(
                  () => disableCustomerFn({ data: { customerId: customer.id } }),
                  "Customer disabled",
                )
              }
            >
              Disable
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function RowInline({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
