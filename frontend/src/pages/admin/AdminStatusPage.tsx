import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  GitCommitHorizontal,
  Clock,
  MessageCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import logo from "@/assets/images/logo.png";

interface AdminStatus {
  apiUp: boolean;
  dbUp: boolean;
  externalCheck: { up: boolean; consecutiveFailures: number; checkedAt: string | null } | null;
  lastDeploy: { sha: string; message: string; actor: string; time: string; status: string } | null;
  recentErrors: { summary: string; count: number; lastSeen: string }[];
  whatsapp: {
    totalSent: number;
    totalFailed: number;
    events: { time: string; to: string; kind: "text" | "template"; status: "sent" | "failed"; detail?: string }[];
  };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// A dedicated page rather than a tab inside the main dashboard — this is
// meant to be its own "app" the client adds to their iPhone home screen
// separately from the day-to-day admin (see useDocumentMeta title below,
// which iOS uses as the shortcut name when you Add to Home Screen from here).
export default function AdminStatusPage() {
  const { admin } = useAdminAuth();
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useDocumentMeta({ title: "Indish Status", noindex: true });

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get<AdminStatus>("/admin/status")
      .then(setStatus)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const allGood =
    status && status.apiUp && status.dbUp && (status.externalCheck === null || status.externalCheck.up);

  return (
    <div className="relative min-h-screen bg-background">
      <AuroraBackground />

      <div className="relative z-10 mx-auto max-w-lg px-5 pb-16 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <img src={logo} alt="Indish" className="h-7 w-auto" />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {admin ? `Signed in as ${admin.name}` : "Status"}
            </p>
            <h1 className="mt-1 font-display text-3xl text-foreground">Site Status</h1>
          </div>
          <button
            onClick={load}
            aria-label="Refresh"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="card-warm mb-6 flex items-center gap-3 border-destructive/40 p-4 text-sm text-destructive">
            <XCircle className="h-5 w-5 shrink-0" />
            Couldn't reach the API to check status — that itself might mean something's down. Pull to refresh.
          </div>
        )}

        {!error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card-warm mb-6 flex items-center gap-3 p-5 ${
              loading ? "" : allGood ? "border-emerald-500/40" : "border-destructive/40"
            }`}
          >
            {loading ? (
              <Clock className="h-6 w-6 shrink-0 animate-pulse text-muted-foreground" />
            ) : allGood ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
            )}
            <div>
              <p className="font-display text-lg text-foreground">
                {loading ? "Checking..." : allGood ? "Everything's running" : "Something needs attention"}
              </p>
              {status?.externalCheck?.checkedAt && (
                <p className="text-xs text-muted-foreground">
                  Last external check {relativeTime(status.externalCheck.checkedAt)}
                </p>
              )}
            </div>
          </motion.div>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatusTile label="Website" ok={status?.externalCheck ? status.externalCheck.up : status?.apiUp} loading={loading} />
          <StatusTile label="API" ok={status?.apiUp} loading={loading} />
          <StatusTile label="Database" ok={status?.dbUp} loading={loading} />
        </div>

        <section className="card-warm mb-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <GitCommitHorizontal className="h-4 w-4 text-primary" />
            Last deploy
          </h2>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && !status?.lastDeploy && (
            <p className="text-sm text-muted-foreground">No deploys recorded yet.</p>
          )}
          {!loading && status?.lastDeploy && (
            <div>
              <p className="text-sm text-foreground">{status.lastDeploy.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status.lastDeploy.actor} · {relativeTime(status.lastDeploy.time)} ·{" "}
                <span className="font-mono">{status.lastDeploy.sha.slice(0, 7)}</span>
              </p>
            </div>
          )}
        </section>

        <section className="card-warm mb-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Errors, last 24h
          </h2>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && status && status.recentErrors.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              No errors in the last 24 hours.
            </p>
          )}
          {!loading && status && status.recentErrors.length > 0 && (
            <ul className="flex flex-col gap-3">
              {status.recentErrors.map((e, i) => (
                <li key={i} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <p className="text-xs text-foreground">{e.summary}</p>
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                    {e.count}× · last {relativeTime(e.lastSeen)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-warm p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageCircle className="h-4 w-4 text-primary" />
            WhatsApp messages, last 24h
          </h2>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && status && (
            <div className="mb-4 flex gap-3">
              <div className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <p className="font-display text-2xl text-emerald-400">{status.whatsapp.totalSent}</p>
                <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Sent</p>
              </div>
              <div className="flex-1 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center">
                <p className="font-display text-2xl text-destructive">{status.whatsapp.totalFailed}</p>
                <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Failed</p>
              </div>
            </div>
          )}
          {!loading && status && status.whatsapp.events.length === 0 && (
            <p className="text-sm text-muted-foreground">No WhatsApp activity in the last 24 hours.</p>
          )}
          {!loading && status && status.whatsapp.events.length > 0 && (
            <ul className="flex max-h-96 flex-col gap-2.5 overflow-y-auto">
              {status.whatsapp.events.map((e, i) => (
                <li key={i} className="flex items-start gap-2.5 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
                  {e.status === "sent" ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      {e.status === "sent" ? "Sent" : "Failed"} to {e.to}
                      <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-secondary-foreground">
                        {e.kind}
                      </span>
                    </p>
                    {e.detail && <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">{e.detail}</p>}
                    <p className="text-[0.65rem] text-muted-foreground">{relativeTime(e.time)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusTile({ label, ok, loading }: { label: string; ok?: boolean; loading: boolean }) {
  const state = loading ? "loading" : ok === undefined ? "unknown" : ok ? "up" : "down";
  return (
    <div className="card-warm flex flex-col items-center gap-1.5 p-4 text-center">
      {state === "loading" && <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />}
      {state === "up" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
      {state === "down" && <XCircle className="h-5 w-5 text-destructive" />}
      {state === "unknown" && <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
  );
}
