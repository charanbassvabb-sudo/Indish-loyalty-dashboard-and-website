import { useEffect, useState } from "react";
import { LogOut, CalendarCheck2, BarChart3, ClipboardList, PenSquare, ExternalLink, CreditCard, UtensilsCrossed, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { LOYALTY_APP_URL } from "@/lib/loyalty";
import { api } from "@/lib/api";
import { AdminReservationsTab } from "./tabs/AdminReservationsTab";
import { AdminPaymentsTab } from "./tabs/AdminPaymentsTab";
import { AdminMenuTab } from "./tabs/AdminMenuTab";
import { AdminReportsTab } from "./tabs/AdminReportsTab";
import { AdminAvailabilityTab } from "./tabs/AdminAvailabilityTab";
import { AdminContentTab } from "./tabs/AdminContentTab";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { AdminClock } from "@/components/admin/AdminClock";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";
import logo from "@/assets/images/logo.png";

type Tab = "reservations" | "payments" | "menu" | "reports" | "availability" | "content";

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: "reservations", label: "Reservations", icon: ClipboardList },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "availability", label: "Availability", icon: CalendarCheck2 },
  { id: "content", label: "Site Content", icon: PenSquare },
];

// Supports deep links from the loyalty app, e.g. /admin?tab=reservations&search=0977123456
const initialParams = new URLSearchParams(window.location.search);
const initialTab = TABS.find((t) => t.id === initialParams.get("tab"))?.id ?? "reservations";
const initialSearch = initialParams.get("search") ?? "";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "A";
}

export default function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  useDocumentMeta({ title: "Admin Dashboard | Indish", noindex: true });

  // Bookings sit as PENDING_PAYMENT until a staff member checks the deposit
  // and confirms it (see reservation.controller.ts) — surface how many are
  // waiting right on the tab so nobody has to go looking for them.
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  async function refreshPendingCount() {
    try {
      const res = await api.get<{ total: number }>("/admin/reservations?status=PENDING_PAYMENT&pageSize=1");
      setPendingCount(res.total);
    } catch {
      // Non-critical — the badge just keeps showing its last known value.
    }
  }
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Payments the system couldn't confidently auto-verify — the actual
  // "admin only handles what needs a human" queue (see payment.controller.ts).
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  async function refreshReviewCount() {
    try {
      const res = await api.get<{ total: number }>("/admin/payment-attempts?status=REQUIRES_REVIEW&pageSize=1");
      setReviewCount(res.total);
    } catch {
      // Non-critical — the badge just keeps showing its last known value.
    }
  }
  useEffect(() => {
    refreshReviewCount();
    const interval = setInterval(refreshReviewCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-background">
      <AuroraBackground />

      <div className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <Link to="/" className="shrink-0">
              <img src={logo} alt="Indish" className="h-9 w-auto" />
            </Link>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live · Admin Dashboard
              </p>
              <h1 className="font-display text-xl text-foreground md:text-2xl">
                {TABS.find((t) => t.id === tab)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AdminClock />
            <a
              href={LOYALTY_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Loyalty Dashboard
            </a>

            <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-ember font-display text-xs text-primary-foreground shadow-warm"
                aria-hidden
              >
                {admin ? initials(admin.name) : "A"}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-semibold text-foreground">{admin?.name}</p>
                <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">{admin?.role}</p>
              </div>
            </div>

            <button
              onClick={() => setChangePasswordOpen(true)}
              aria-label="Change password"
              className="flex items-center gap-1.5 rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:px-4 sm:py-2"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Change Password</span>
            </button>

            <button
              onClick={() => logout()}
              aria-label="Sign out"
              className="flex items-center gap-1.5 rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive sm:px-4 sm:py-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 md:px-10" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.id === "reservations" && Boolean(pendingCount) && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.6rem] font-bold text-accent-foreground">
                  {pendingCount}
                </span>
              )}
              {t.id === "payments" && Boolean(reviewCount) && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-destructive-foreground">
                  {reviewCount}
                </span>
              )}
              {tab === t.id && (
                <motion.span
                  layoutId="admin-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-ember"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8 md:px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "reservations" && (
              <AdminReservationsTab initialSearch={initialSearch} onReservationChanged={refreshPendingCount} />
            )}
            {tab === "payments" && (
              <AdminPaymentsTab
                onChanged={() => {
                  refreshReviewCount();
                  refreshPendingCount();
                }}
              />
            )}
            {tab === "menu" && <AdminMenuTab />}
            {tab === "reports" && <AdminReportsTab />}
            {tab === "availability" && <AdminAvailabilityTab />}
            {tab === "content" && <AdminContentTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
