import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import type {
  AdminCateringPackage,
  AdminCateringCategory,
  AdminCateringEnquiry,
  CateringEnquiryListResponse,
  CateringEnquiryStatus,
} from "@/types/admin";
import { CATERING_ENQUIRY_STATUS_LABEL, CATERING_ENQUIRY_STATUS_STYLE } from "@/types/admin";

const TIER_STYLE: Record<string, string> = {
  BRONZE: "border-amber-700/40 bg-amber-700/10 text-amber-500",
  SILVER: "border-slate-400/40 bg-slate-400/10 text-slate-300",
  GOLD: "border-gold/50 bg-gold/10 text-gold",
  PLATINUM: "border-primary/50 bg-primary/10 text-primary",
};

const PAGE_SIZE = 15;

export function AdminCateringTab() {
  const [subTab, setSubTab] = useState<"catalog" | "enquiries">("catalog");

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-full border border-border bg-card p-1 w-fit">
        {(["catalog", "enquiries"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`relative rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              subTab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {subTab === t && (
              <motion.span
                layoutId="catering-subtab-bg"
                className="bg-gradient-ember absolute inset-0 rounded-full"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative z-10">{t === "catalog" ? "Catalog" : "Enquiries"}</span>
          </button>
        ))}
      </div>

      {subTab === "catalog" ? <CateringCatalogEditor /> : <CateringEnquiriesList />}
    </div>
  );
}

// --- Catalog editor ---

function CateringCatalogEditor() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<AdminCateringPackage[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<{ packages: AdminCateringPackage[] }>("/admin/catering/packages")
      .then((res) => setPackages(res.packages))
      .catch(() => toast({ title: "Couldn't load catering packages", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} onChanged={load} />
      ))}
    </div>
  );
}

function PackageCard({ pkg, onChanged }: { pkg: AdminCateringPackage; onChanged: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description ?? "");
  const [priceNote, setPriceNote] = useState(pkg.priceNote ?? "");
  const [active, setActive] = useState(pkg.active);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  async function savePackage() {
    setSaving(true);
    try {
      await api.patch(`/admin/catering/packages/${pkg.id}`, { name, description, priceNote, active });
      toast({ title: "Package updated", description: pkg.tier, variant: "success" });
      setEditing(false);
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't save package", description: err instanceof ApiRequestError ? err.message : "Please try again.", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      await api.post("/admin/catering/categories", { packageId: pkg.id, name: newCategoryName.trim() });
      setNewCategoryName("");
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't add category", description: err instanceof ApiRequestError ? err.message : "Please try again.", variant: "error" });
    } finally {
      setAddingCategory(false);
    }
  }

  async function deleteCategory(categoryId: number) {
    try {
      await api.delete(`/admin/catering/categories/${categoryId}`);
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't delete category", description: err instanceof ApiRequestError ? err.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div className="card-warm p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${TIER_STYLE[pkg.tier]}`}>{pkg.tier}</span>
          {!editing && (
            <div>
              <p className="font-display text-lg text-foreground">
                {pkg.name}
                {!pkg.active && <span className="ml-2 text-xs font-semibold uppercase text-muted-foreground">(Inactive)</span>}
              </p>
              {pkg.priceNote && <p className="text-xs text-muted-foreground">{pkg.priceNote}</p>}
            </div>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Package name" />
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="field resize-none" placeholder="Description" />
          <input value={priceNote} onChange={(e) => setPriceNote(e.target.value)} className="field" placeholder='Price note, e.g. "From ZMW 150/head"' />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-primary" />
            Active (shown on the public catering page)
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary">
              Cancel
            </button>
            <button
              type="button"
              onClick={savePackage}
              disabled={saving}
              className="flex-1 rounded-full bg-gradient-ember px-4 py-2 text-xs font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Package"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {pkg.categories.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} onDeleteCategory={() => deleteCategory(cat.id)} onChanged={onChanged} />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New subcategory name"
          className="field flex-1"
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={addingCategory || !newCategoryName.trim()}
          className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Subcategory
        </button>
      </div>
    </div>
  );
}

function CategoryBlock({
  category,
  onDeleteCategory,
  onChanged,
}: {
  category: AdminCateringCategory;
  onDeleteCategory: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  async function addItem() {
    if (!newItemName.trim() || !newItemQty.trim()) return;
    setAddingItem(true);
    try {
      await api.post("/admin/catering/items", { categoryId: category.id, name: newItemName.trim(), quantity: newItemQty.trim() });
      setNewItemName("");
      setNewItemQty("");
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't add item", description: err instanceof ApiRequestError ? err.message : "Please try again.", variant: "error" });
    } finally {
      setAddingItem(false);
    }
  }

  async function deleteItem(id: number) {
    try {
      await api.delete(`/admin/catering/items/${id}`);
      onChanged();
    } catch (err) {
      toast({ title: "Couldn't delete item", description: err instanceof ApiRequestError ? err.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">{category.name}</span>
        <button type="button" onClick={onDeleteCategory} aria-label="Delete subcategory" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="mb-2 flex flex-col gap-1">
        {category.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-foreground">{item.name}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.quantity}
              <button type="button" onClick={() => deleteItem(item.id)} aria-label="Delete item" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          </li>
        ))}
        {category.items.length === 0 && <li className="text-xs text-muted-foreground">No items yet</li>}
      </ul>
      <div className="flex gap-1.5">
        <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Item name" className="field flex-1 text-xs" />
        <input value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} placeholder="Qty, e.g. 2 pcs/guest" className="field w-32 text-xs" />
        <button
          type="button"
          onClick={addItem}
          disabled={addingItem || !newItemName.trim() || !newItemQty.trim()}
          aria-label="Add item"
          className="rounded-full border border-primary/40 bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// --- Enquiries list ---

function CateringEnquiriesList() {
  const { toast } = useToast();
  const [branch, setBranch] = useState<"" | "LUSAKA" | "KITWE">("");
  const [status, setStatus] = useState<"" | CateringEnquiryStatus>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CateringEnquiryListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [branch, status, debouncedSearch]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (branch) params.set("branch", branch);
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    setLoading(true);
    api
      .get<CateringEnquiryListResponse>(`/admin/catering/enquiries?${params}`)
      .then(setData)
      .catch(() => toast({ title: "Couldn't load enquiries", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }, [branch, status, debouncedSearch, page, toast]);

  async function changeStatus(enquiry: AdminCateringEnquiry, next: CateringEnquiryStatus) {
    setData((d) => (d ? { ...d, enquiries: d.enquiries.map((e) => (e.id === enquiry.id ? { ...e, status: next } : e)) } : d));
    try {
      await api.patch(`/admin/catering/enquiries/${enquiry.id}`, { status: next });
    } catch (err) {
      setData((d) => (d ? { ...d, enquiries: d.enquiries.map((e) => (e.id === enquiry.id ? { ...e, status: enquiry.status } : e)) } : d));
      toast({ title: "Couldn't update status", description: err instanceof ApiRequestError ? err.message : "Please try again.", variant: "error" });
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="card-warm mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className="field pl-9" />
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value as typeof branch)} className="field w-auto">
          <option value="">All branches</option>
          <option value="LUSAKA">Lusaka</option>
          <option value="KITWE">Kitwe</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field w-auto">
          <option value="">All statuses</option>
          {Object.entries(CATERING_ENQUIRY_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="card-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Package</th>
                <th className="px-5 py-3">Event Date</th>
                <th className="px-5 py-3">Guests</th>
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
              {!loading && data?.enquiries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No catering enquiries match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.enquiries.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-border/60 ${i % 2 === 1 ? "bg-background/30" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{e.customerName}</div>
                      <div className="text-xs text-muted-foreground">{e.phone}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{e.branch.name.replace("Indish — ", "")}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.package ? e.package.tier : "Not specified"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.eventDate.slice(0, 10)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.guestCount}</td>
                    <td className="px-5 py-3">
                      <select
                        value={e.status}
                        onChange={(ev) => changeStatus(e, ev.target.value as CateringEnquiryStatus)}
                        className={`rounded-full border-0 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${CATERING_ENQUIRY_STATUS_STYLE[e.status]}`}
                      >
                        {Object.entries(CATERING_ENQUIRY_STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm text-muted-foreground">
          <span>{data ? `${data.total} enquir${data.total === 1 ? "y" : "ies"}` : ""}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="rounded-full border border-border p-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
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
              className="rounded-full border border-border p-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
