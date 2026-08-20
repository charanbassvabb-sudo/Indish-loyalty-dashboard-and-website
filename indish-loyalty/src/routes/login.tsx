import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { IndishLogo } from "@/components/indish-logo";
import { AuroraBackground } from "@/components/aurora-background";
import { Lock, User } from "lucide-react";
import { loginFn } from "@/lib/functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Indish Loyalty" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      await loginFn({ data: { username, password } });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-noir px-4 py-12">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-[calc(var(--radius-xl)+1px)] bg-gradient-to-b from-primary/40 via-border to-border p-px shadow-elegant"
      >
        <Card className="w-full max-w-md border-none bg-card/90 p-8 shadow-none backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 0px oklch(0.78 0.13 85 / 0))",
                  "drop-shadow(0 0 18px oklch(0.78 0.13 85 / 0.55))",
                  "drop-shadow(0 0 0px oklch(0.78 0.13 85 / 0))",
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <IndishLogo size={96} className="shadow-gold" />
            </motion.div>
            <h1 className="mt-5 font-display text-3xl text-gold">Indish Loyalty</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Staff Portal · Fusion Food &amp; Cocktails
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Staff username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  required
                  placeholder="e.g. admin"
                  className="pl-9"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="btn-shine w-full bg-gold-gradient font-semibold text-primary-foreground transition-transform hover:scale-[1.02] hover:opacity-90"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Restricted access · Managed by <span className="text-gold">Indish Management</span>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
