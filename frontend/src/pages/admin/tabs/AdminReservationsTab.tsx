import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, PartyPopper, ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatReservationDate } from "@/lib/utils";
import { ReservationEditDrawer } from "@/components/admin/ReservationEditDrawer";
import { StatusQuickMenu } from "@/components/admin/StatusQuickMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import type { AdminReservation, ReservationListResponse, ReservationStatus } from "@/types/admin";
import { STATUS_LABEL } from "@/types/admin";

/** How long an inline status change waits before it's actually sent to the
 *  server — clicking Undo within this window cancels it for free (no PATCH
 *  ever fires, so there's no duplicate-WhatsApp-notification risk either). */
const UNDO_WINDOW_MS = 5500;

interface PendingStatusChange {
  timeoutId: number;
  previousStatus: ReservationStatus;
}

const PAGE_SIZE = 15;

export function AdminReservationsTab({
  initialSearch = "",
  onReservationChanged,
}: {
  initialSearch?: string;
  onReservationChanged?: () => void;
}) {
  const { toast } = useToast();
  const [branch, setBranch] = useState<"" | "LUSAKA" | "KITWE">("");
  const [status, setStatus] = useState<"" | ReservationStatus>("");
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ReservationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminReservation | null>(null);
  // Deliberately NOT cleared on unmount (switching tabs, say) — a status
  // change the admin actually picked should still go through in the
  // background; only clicking Undo itself should cancel it.
  const pendingStatusChanges = useRef(new Map<number, PendingStatusChange>());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [branch, status, debouncedSearch]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (branch) params.set("branch", branch);
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);

    setLoading(true);
    api
      .get<ReservationListResponse>(`/admin/reservations?${params}`)
      .then(setData)
      .catch(() => toast({ title: "Couldn't load reservations", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }, [branch, status, debouncedSearch, page, toast]);

  function changeStatusWithUndo(reservation: AdminReservation, nextStatus: ReservationStatus) {
    const previousStatus = reservation.status;

    // A second quick-change on the same row before the first committed —
    // cancel the earlier one rather than stacking two pending PATCHes.
    const existing = pendingStatusChanges.current.get(reservation.id);
    if (existing) window.clearTimeout(existing.timeoutId);

    setData((d) =>
      d
        ? { ...d, reservations: d.reservations.map((r) => (r.id === reservation.id ? { ...r, status: nextStatus } : r)) }
        : d,
    );

    const timeoutId = window.setTimeout(async () => {
      pendingStatusChanges.current.delete(reservation.id);
      try {
        await api.patch(`/admin/reservations/${reservation.id}`, { status: nextStatus });
        onReservationChanged?.();
      } catch (err) {
        setData((d) =>
          d
            ? { ...d, reservations: d.reservations.map((r) => (r.id === reservation.id ? { ...r, status: previousStatus } : r)) }
            : d,
        );
        toast({
          title: "Couldn't update status",
          description: err instanceof ApiRequestError ? err.message : "Please try again.",
          variant: "error",
        });
      }
    }, UNDO_WINDOW_MS);

    pendingStatusChanges.current.set(reservation.id, { timeoutId, previousStatus });

    toast({
      title: `Marked ${STATUS_LABEL[nextStatus]}`,
      description: reservation.reference,
      variant: "success",
      duration: UNDO_WINDOW_MS + 500,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingStatusChanges.current.get(reservation.id);
          if (!pending) return;
          window.clearTimeout(pending.timeoutId);
          pendingStatusChanges.current.delete(reservation.id);
          setData((d) =>
            d
              ? {
                  ...d,
                  reservations: d.reservations.map((r) =>
                    r.id === reservation.id ? { ...r, status: pending.previousStatus } : r,
                  ),
                }
              : d,
          );
        },
      },
    });
  }

  function handleSaved(updated: AdminReservation) {
    setData((d) =>
      d
        ? { ...d, reservations: d.reservations.map((r) => (r.id === updated.id ? updated : r)) }
        : d,
    );
    onReservationChanged?.();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (status) params.set("status", status);
    window.open(`/api/admin/reservations/export?${params}`, "_blank");
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="card-warm mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, or reference"
            className="field pl-9"
          />
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value as typeof branch)} className="field w-auto">
          <option value="">All branches</option>
          <option value="LUSAKA">Lusaka</option>
          <option value="KITWE">Kitwe</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field w-auto">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          className="btn-shine flex items-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="card-warm overflow-hidden">
        {/* Desktop/tablet: full table. A 7-column table just doesn't fit a
            phone screen usefully even with horizontal scroll — the status
            pill (the thing you actually came here to check) would be several
            swipes away — so phones get the stacked card list below instead. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Date &amp; Time</th>
                <th className="px-5 py-3">Guests</th>
                <th className="px-5 py-3">Deposit</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full max-w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading && data?.reservations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No reservations match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.reservations.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(r)}
                    whileHover={{ scale: 1.005 }}
                    className={`relative cursor-pointer border-b border-border/60 transition-colors hover:bg-secondary/60 hover:shadow-warm ${
                      i % 2 === 1 ? "bg-background/30" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        {r.reference}
                        {r.bookingType === "PARTY" && (
                          <PartyPopper className="h-3.5 w-3.5 text-primary" aria-label="Party booking" />
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.branch.name.replace("Indish — ", "")}</td>
                    <td className="px-5 py-3 text-foreground">{r.customerName}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatReservationDate(r.date, { withWeekday: false })} · {r.time}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.guests}</td>
                    <td className="px-5 py-3 text-muted-foreground">ZMW {r.depositAmount}</td>
                    <td className="px-5 py-3">
                      <StatusQuickMenu status={r.status} onChange={(next) => changeStatusWithUndo(r, next)} />
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Phone: one card per reservation, most important info first. */}
        <div className="divide-y divide-border/60 sm:hidden">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3.5 w-40" />
                <Skeleton className="mt-2 h-3.5 w-48" />
              </div>
            ))}
          {!loading && data?.reservations.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No reservations match these filters.</p>
          )}
          {!loading &&
            data?.reservations.map((r, i) => (
              <motion.button
                key={r.id}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelected(r)}
                className="flex w-full flex-col gap-1.5 p-4 text-left transition-colors active:bg-secondary/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    {r.reference}
                    {r.bookingType === "PARTY" && (
                      <PartyPopper className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Party booking" />
                    )}
                  </span>
                  <StatusQuickMenu status={r.status} onChange={(next) => changeStatusWithUndo(r, next)} />
                </div>
                <p className="text-sm text-foreground">{r.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {r.branch.name.replace("Indish — ", "")} · {formatReservationDate(r.date, { withWeekday: false })} ·{" "}
                  {r.time}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.guests} guest{r.guests === 1 ? "" : "s"} · ZMW {r.depositAmount} deposit
                </p>
              </motion.button>
            ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm text-muted-foreground">
          <span>{data ? `${data.total} reservation${data.total === 1 ? "" : "s"}` : ""}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="rounded-full border border-border p-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="rounded-full border border-border p-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ReservationEditDrawer
        key={selected?.id ?? "none"}
        reservation={selected}
        onClose={() => setSelected(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
