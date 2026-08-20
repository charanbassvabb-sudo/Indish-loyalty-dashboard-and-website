import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Sparkles } from "lucide-react";
import { getSettingsFn, registerCustomerFn } from "@/lib/functions";
import { formatK } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/register")({
  head: () => ({ meta: [{ title: "Register customer — Indish Loyalty" }] }),
  loader: ({ context }) => getSettingsFn({ data: { branch: context.branch } }),
  component: RegisterPage,
});

function RegisterPage() {
  const settings = Route.useLoaderData();
  const { branch } = Route.useRouteContext();
  const navigate = useNavigate();
  const [initialSpend, setInitialSpend] = useState("");
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const qualifies = Number(initialSpend) >= settings.minimumSpend;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!qualifies) {
      toast.error(`Customer must spend at least ${formatK(settings.minimumSpend)}`);
      return;
    }
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await registerCustomerFn({
        data: {
          branch,
          fullName: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
          gender: gender ?? null,
          notes: String(form.get("notes") ?? "") || null,
          initialSpend: Number(initialSpend),
        },
      });
      toast.success("Customer registered! Loyalty ID issued.");
      navigate({ to: "/customers" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register customer";
      const phone = String(form.get("phone") ?? "");
      // Duplicate-phone rejection from registerCustomerFn — send staff
      // straight to the existing customer instead of leaving them stuck.
      if (message.startsWith("Already registered as") && phone) {
        toast.error(message, {
          action: { label: "Search", onClick: () => navigate({ to: "/search", search: { q: phone } }) },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New member</p>
        <h1 className="font-display text-4xl text-gold">Register Customer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Eligible after a qualifying purchase of at least{" "}
          <span className="text-gold">{formatK(settings.minimumSpend)}</span>. A unique loyalty ID
          like <span className="font-mono text-gold">{settings.loyaltyPrefix}000006</span> is
          generated automatically.
        </p>
      </header>

      <Card className="border-border/60 bg-card p-6 shadow-elegant">
        <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="spend">Qualifying purchase (K)</Label>
            <Input
              id="spend"
              type="number"
              inputMode="decimal"
              value={initialSpend}
              onChange={(e) => setInitialSpend(e.target.value)}
              placeholder={`Minimum ${formatK(settings.minimumSpend)}`}
              required
            />
            {initialSpend && (
              <p className={`text-xs ${qualifies ? "text-success" : "text-destructive"}`}>
                {qualifies
                  ? `✓ Qualifies for loyalty enrollment (K${(Number(initialSpend) - settings.minimumSpend).toLocaleString()} above minimum)`
                  : `Needs K${(settings.minimumSpend - Number(initialSpend)).toLocaleString()} more to qualify`}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required placeholder="e.g. Chanda Mwansa" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" name="phone" required placeholder="+260 971 234 567" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="name@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender (optional)</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Campaign length</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              {settings.campaignDuration} days · from today
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Anything staff should remember about this guest…" />
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-md border border-gold/30 bg-gold/5 p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-gold" />
              <div className="text-sm">
                <div className="font-medium text-gold">On registration</div>
                <div className="text-xs text-muted-foreground">
                  Unique loyalty ID · {settings.campaignDuration}-day campaign · {settings.rewardVisit}-visit reward
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gold-gradient text-primary-foreground hover:opacity-90"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? "Registering…" : "Register customer"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
