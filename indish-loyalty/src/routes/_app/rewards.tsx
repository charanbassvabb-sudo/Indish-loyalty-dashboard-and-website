import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Trophy } from "lucide-react";
import { listCustomersFn, getSettingsFn } from "@/lib/functions";

export const Route = createFileRoute("/_app/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Indish Loyalty" }] }),
  loader: async ({ context }) => {
    const [customers, settings] = await Promise.all([
      listCustomersFn({ data: { branch: context.branch } }),
      getSettingsFn({ data: { branch: context.branch } }),
    ]);
    return { customers, settings };
  },
  component: RewardsPage,
});

function RewardsPage() {
  const { customers, settings } = Route.useLoaderData();
  const ready = customers.filter((c) => c.visitCount >= settings.rewardVisit && !c.rewardClaimed);
  const claimed = customers.filter((c) => c.rewardClaimed);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fulfilment</p>
        <h1 className="font-display text-4xl text-gold">Rewards</h1>
      </header>

      <section>
        <h2 className="mb-3 font-display text-2xl">Ready to claim</h2>
        {ready.length === 0 && (
          <Card className="border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            No customers are currently eligible to claim a reward.
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {ready.map((c) => (
            <Card key={c.id} className="flex items-center justify-between border-gold/40 bg-gold/5 p-4">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-gold" />
                <div>
                  <div className="font-medium">{c.fullName}</div>
                  <div className="font-mono text-xs text-gold">{c.loyaltyId}</div>
                </div>
              </div>
              <Button asChild size="sm" className="bg-gold-gradient text-primary-foreground">
                <Link to="/customers/$id" params={{ id: c.id }}>Claim →</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Recently claimed</h2>
        {claimed.length === 0 && (
          <Card className="border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            No rewards claimed yet.
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {claimed.map((c) => (
            <Card key={c.id} className="flex items-center justify-between border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-gold" />
                <div>
                  <div className="font-medium">{c.fullName}</div>
                  <div className="text-xs text-muted-foreground">Reward: {c.rewardType}</div>
                </div>
              </div>
              <Badge variant="outline" className="border-gold/40 text-gold">Claimed</Badge>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
