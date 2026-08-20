import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getSettingsFn, updateSettingsFn } from "@/lib/functions";
import { BRANCHES } from "@/lib/types";
import { Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Indish Loyalty" }] }),
  loader: ({ context }) => getSettingsFn({ data: { branch: context.branch } }),
  component: SettingsPage,
});

function SettingsPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [newReward, setNewReward] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateSettingsFn({ data: s });
      setS(updated);
      toast.success("Campaign settings saved");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Manager only · {BRANCHES.find((b) => b.code === s.branch)?.label ?? s.branch} branch
          </p>
          <h1 className="font-display text-4xl text-gold">Campaign Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything below is configurable and applies only to this branch's campaign. Changes
            apply to new customers immediately.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-gold-gradient text-primary-foreground">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </header>

      <Card className="border-border/60 bg-card p-6">
        <h2 className="font-display text-2xl">Restaurant</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Restaurant name">
            <Input value={s.restaurantName} onChange={(e) => setS({ ...s, restaurantName: e.target.value })} />
          </Field>
          <Field label="Loyalty ID prefix">
            <Input value={s.loyaltyPrefix} onChange={(e) => setS({ ...s, loyaltyPrefix: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Currency symbol">
            <Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Loyalty campaign enabled</div>
              <div className="text-xs text-muted-foreground">Turn the whole program on or off.</div>
            </div>
            <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
          </div>
        </div>
      </Card>

      <Card className="border-border/60 bg-card p-6">
        <h2 className="font-display text-2xl">Campaign rules</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={`Minimum spend (${s.currency})`}>
            <Input type="number" value={s.minimumSpend} onChange={(e) => setS({ ...s, minimumSpend: +e.target.value })} />
          </Field>
          <Field label="Campaign duration (days)">
            <Input type="number" value={s.campaignDuration} onChange={(e) => setS({ ...s, campaignDuration: +e.target.value })} />
          </Field>
          <Field label="Required visits before reward">
            <Input type="number" value={s.requiredVisits} onChange={(e) => setS({ ...s, requiredVisits: +e.target.value })} />
          </Field>
          <Field label="Reward visit number">
            <Input type="number" value={s.rewardVisit} onChange={(e) => setS({ ...s, rewardVisit: +e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card className="border-border/60 bg-card p-6">
        <h2 className="font-display text-2xl">Reward options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choices staff can pick from when a customer claims their reward.
        </p>
        <div className="mt-4 space-y-2">
          {s.rewardOptions.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border p-2">
              <Input
                value={r}
                onChange={(e) => {
                  const copy = [...s.rewardOptions];
                  copy[i] = e.target.value;
                  setS({ ...s, rewardOptions: copy });
                }}
                className="border-0 bg-transparent focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setS({ ...s, rewardOptions: s.rewardOptions.filter((_, x) => x !== i) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newReward}
              onChange={(e) => setNewReward(e.target.value)}
              placeholder="e.g. Complimentary Wine"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!newReward.trim()) return;
                setS({ ...s, rewardOptions: [...s.rewardOptions, newReward.trim()] });
                setNewReward("");
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
