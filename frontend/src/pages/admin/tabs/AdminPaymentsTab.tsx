import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, ImageOff } from "lucide-react";
import { api } from "@/lib/api";
import { PaymentAttemptDrawer } from "@/components/admin/PaymentAttemptDrawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import type { PaymentAttemptListItem, PaymentAttemptListResponse, PaymentDashboardStatus } from "@/types/admin";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_STYLE, paymentAttemptOrderInfo } from "@/types/admin";

const PAGE_SIZE = 15;

export function AdminPaymentsTab({ onChanged }: { onChanged?: () => void }) {
  const { toast } = useToast();
  const [branch, setBranch] = useState<"" | "LUSAKA" | "KITWE">("");
  const [status, setStatus] = useState<"" | PaymentDashboardStatus>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaymentAttemptListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PaymentAttemptListItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [branch, status, debouncedSearch]);

  function load() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (branch) params.set("branch", branch);
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);

    setLoading(true);
    api
      .get<PaymentAttemptListResponse>(`/admin/payment-attempts?${params}`)
      .then(setData)
      .catch(() => toast({ title: "Couldn't load payments", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(load, [branch, status, debouncedSearch, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleActed() {
    load();
    onChanged?.();
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="card-warm mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or reference"
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
          {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {!status && (
        <p className="mb-4 text-xs text-muted-foreground">
          Showing the most recent payment attempts across every booking. Filter by "Waiting for Payment" to see
          bookings that haven't had a screenshot uploaded yet.
        </p>
      )}

      <div className="card-warm overflow-hidden">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">Expected</th>
                <th className="px-5 py-3">Detected</th>
                <th className="px-5 py-3">Transaction ID</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full max-w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading && data?.attempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <ImageOff className="mx-auto mb-2 h-6 w-6" />
                    No payments match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.attempts.map((a, i) => {
                  const info = paymentAttemptOrderInfo(a);
                  return (
                    <motion.tr
                      key={`${a.id ?? "wait"}-${info.kind}-${info.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setSelected(a)}
                      whileHover={{ scale: 1.005 }}
                      className={`relative cursor-pointer border-b border-border/60 transition-colors hover:bg-secondary/60 hover:shadow-warm ${
                        i % 2 === 1 ? "bg-background/30" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{info.customerName}</div>
                        <div className="text-xs text-muted-foreground">{info.phone}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {info.reference}
                        {info.kind === "TAKEAWAY" && (
                          <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-secondary-foreground">
                            Takeaway
                          </span>
                        )}
                        <div className="text-xs">{info.branchName.replace("Indish — ", "")}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{info.amountLabel}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {a.extracted?.amount ? `ZMW ${a.extracted.amount}` : "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {a.extracted?.transactionId ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${PAYMENT_STATUS_STYLE[a.paymentStatus]}`}
                        >
                          {PAYMENT_STATUS_LABEL[a.paymentStatus]}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border/60 sm:hidden">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3.5 w-40" />
                <Skeleton className="mt-2 h-3.5 w-48" />
              </div>
            ))}
          {!loading && data?.attempts.length === 0 && (
            <p className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground">
              <ImageOff className="h-6 w-6" />
              No payments match these filters.
            </p>
          )}
          {!loading &&
            data?.attempts.map((a, i) => {
              const info = paymentAttemptOrderInfo(a);
              return (
                <motion.button
                  key={`${a.id ?? "wait"}-${info.kind}-${info.id}`}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelected(a)}
                  className="flex w-full flex-col gap-1.5 p-4 text-left transition-colors active:bg-secondary/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{info.customerName}</span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${PAYMENT_STATUS_STYLE[a.paymentStatus]}`}
                    >
                      {PAYMENT_STATUS_LABEL[a.paymentStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{info.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {info.reference}
                    {info.kind === "TAKEAWAY" && (
                      <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-secondary-foreground">
                        Takeaway
                      </span>
                    )}
                    {" · "}
                    {info.branchName.replace("Indish — ", "")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expected {info.amountLabel} · Detected {a.extracted?.amount ? `ZMW ${a.extracted.amount}` : "—"}
                  </p>
                  {a.extracted?.transactionId && (
                    <p className="font-mono text-[0.7rem] text-muted-foreground">{a.extracted.transactionId}</p>
                  )}
                </motion.button>
              );
            })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm text-muted-foreground">
          <span>{data ? `${data.total} payment${data.total === 1 ? "" : "s"}` : ""}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-border px-3 py-1.5 transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-border px-3 py-1.5 transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <PaymentAttemptDrawer
        key={selected ? `${selected.id}-${paymentAttemptOrderInfo(selected).kind}-${paymentAttemptOrderInfo(selected).id}` : "none"}
        attempt={selected}
        onClose={() => setSelected(null)}
        onActed={handleActed}
      />
    </div>
  );
}
