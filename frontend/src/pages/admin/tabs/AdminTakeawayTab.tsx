import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { TakeawayOrderDrawer } from "@/components/admin/TakeawayOrderDrawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import type { AdminTakeawayOrder, TakeawayOrderListResponse, TakeawayOrderStatus } from "@/types/admin";
import { TAKEAWAY_STATUS_LABEL, TAKEAWAY_STATUS_STYLE } from "@/types/admin";

const PAGE_SIZE = 15;

export function AdminTakeawayTab({ onOrderChanged }: { onOrderChanged?: () => void }) {
  const { toast } = useToast();
  const [branch, setBranch] = useState<"" | "LUSAKA" | "KITWE">("");
  const [status, setStatus] = useState<"" | TakeawayOrderStatus>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<TakeawayOrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminTakeawayOrder | null>(null);

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
      .get<TakeawayOrderListResponse>(`/admin/takeaway-orders?${params}`)
      .then(setData)
      .catch(() => toast({ title: "Couldn't load takeaway orders", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }, [branch, status, debouncedSearch, page, toast]);

  function handleSaved(updated: AdminTakeawayOrder) {
    setData((d) => (d ? { ...d, orders: d.orders.map((o) => (o.id === updated.id ? updated : o)) } : d));
    onOrderChanged?.();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (status) params.set("status", status);
    window.open(`/api/admin/takeaway-orders/export?${params}`, "_blank");
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
          {Object.entries(TAKEAWAY_STATUS_LABEL).map(([value, label]) => (
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Pickup</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total</th>
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
              {!loading && data?.orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No takeaway orders match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.orders.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(o)}
                    whileHover={{ scale: 1.005 }}
                    className={`relative cursor-pointer border-b border-border/60 transition-colors hover:bg-secondary/60 hover:shadow-warm ${
                      i % 2 === 1 ? "bg-background/30" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-foreground">{o.reference}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.branch.name.replace("Indish — ", "")}</td>
                    <td className="px-5 py-3 text-foreground">{o.customerName}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {o.pickupDate.slice(0, 10)} · {o.pickupTime}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.items.length}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      ZMW {o.totalAmount}
                      {o.discount && (
                        <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-primary">
                          Discounted
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${TAKEAWAY_STATUS_STYLE[o.status]}`}
                      >
                        {TAKEAWAY_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm text-muted-foreground">
          <span>{data ? `${data.total} order${data.total === 1 ? "" : "s"}` : ""}</span>
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

      <TakeawayOrderDrawer key={selected?.id ?? "none"} order={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
    </div>
  );
}
