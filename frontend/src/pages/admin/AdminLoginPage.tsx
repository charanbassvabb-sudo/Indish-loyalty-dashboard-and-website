import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { useAdminAuth, ApiRequestError } from "@/context/AdminAuthContext";
import { useToast } from "@/context/ToastContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import logo from "@/assets/images/logo.png";

export default function AdminLoginPage() {
  const { admin, loading, login } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  useDocumentMeta({ title: "Admin Login | Indish", noindex: true });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && admin) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof ApiRequestError ? err.message : "Please check your details and try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <AuroraBackground />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm rounded-[calc(var(--radius-2xl)+1px)] bg-gradient-to-b from-primary/40 via-border to-border p-px shadow-lift"
      >
        <div className="rounded-[var(--radius-2xl)] bg-card/90 p-8 backdrop-blur-xl">
          <p className="eyebrow text-center">Admin</p>
          <motion.img
            src={logo}
            alt="Indish"
            className="mx-auto mt-2 h-14 w-auto"
            animate={{ filter: ["drop-shadow(0 0 0px oklch(0.62 0.19 264 / 0))", "drop-shadow(0 0 14px oklch(0.62 0.19 264 / 0.55))", "drop-shadow(0 0 0px oklch(0.62 0.19 264 / 0))"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <h1 className="mt-2 text-center font-display text-xl text-foreground">Dashboard Login</h1>

          <div className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field pl-10"
                  autoComplete="username"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Password
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pl-10"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="btn-shine bg-gradient-ember shadow-warm mt-2 rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
