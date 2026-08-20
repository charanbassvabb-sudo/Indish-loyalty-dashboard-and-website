import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listStaffFn, createStaffFn, updateStaffFn } from "@/lib/functions";
import type { Staff } from "@/lib/types";
import { UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/staff")({
  head: () => ({ meta: [{ title: "Staff — Indish Loyalty" }] }),
  loader: () => listStaffFn(),
  component: StaffPage,
});

function StaffPage() {
  const staff = Route.useLoaderData();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await createStaffFn({
        data: {
          fullName: String(form.get("fullName") ?? ""),
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
          role: (form.get("role") as "manager" | "staff") ?? "staff",
        },
      });
      toast.success("Staff account created");
      setAddOpen(false);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create staff account");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    try {
      await updateStaffFn({
        data: {
          id: editing.id,
          fullName: String(form.get("fullName") ?? ""),
          role: (form.get("role") as "manager" | "staff") ?? "staff",
          active: form.get("active") === "on",
          newPassword: newPassword || undefined,
        },
      });
      toast.success("Staff account updated");
      setEditing(null);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update staff account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team</p>
          <h1 className="font-display text-4xl text-gold">Staff Accounts</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold-gradient text-primary-foreground">
              <UserPlus className="mr-2 h-4 w-4" /> Add staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add staff account</DialogTitle>
              <DialogDescription>Create a login for a new team member.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onCreate}>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" required placeholder="e.g. Mutale Banda" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" required placeholder="e.g. mutale" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="staff">
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy} className="bg-gold-gradient text-primary-foreground">
                  Create account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="overflow-hidden border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {staff.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient font-semibold text-primary-foreground">
                      {m.fullName[0]}
                    </div>
                    <span className="font-medium">{m.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{m.username}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={m.role === "manager" ? "border-gold/40 text-gold" : ""}>
                    {m.role === "manager" && <Shield className="mr-1 h-3 w-3" />}
                    {m.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={m.active ? "border-success/40 text-success" : "border-muted-foreground/40 text-muted-foreground"}>
                    {m.active ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit staff account</DialogTitle>
            <DialogDescription>{editing?.username}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form className="space-y-4" onSubmit={onUpdate}>
              <div className="space-y-2">
                <Label htmlFor="e-fullName">Full name</Label>
                <Input id="e-fullName" name="fullName" defaultValue={editing.fullName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-role">Role</Label>
                <Select name="role" defaultValue={editing.role}>
                  <SelectTrigger id="e-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-newPassword">Reset password (optional)</Label>
                <Input id="e-newPassword" name="newPassword" type="password" minLength={6} placeholder="Leave blank to keep current password" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="text-sm font-medium">Account active</div>
                <Switch name="active" defaultChecked={editing.active} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={busy} className="bg-gold-gradient text-primary-foreground">
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
