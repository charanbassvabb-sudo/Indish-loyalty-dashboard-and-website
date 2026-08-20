import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Leaf } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { ALL_MENU_BADGES, type AdminMenuCategory, type AdminMenuItem, type AdminMenuBadge } from "@/types/admin";

type BranchScope = "BOTH" | "LUSAKA" | "KITWE";

interface DraftState {
  categoryId: number;
  branchScope: BranchScope;
  name: string;
  description: string;
  price: string;
  veg: boolean;
  badges: AdminMenuBadge[];
}

function draftFor(item: AdminMenuItem | null, defaultCategoryId: number): DraftState {
  return {
    categoryId: item?.categoryId ?? defaultCategoryId,
    branchScope: item?.branch ?? "BOTH",
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(item.price) : "",
    veg: item?.veg ?? false,
    badges: item?.badges ?? [],
  };
}

export function MenuItemDrawer({
  item,
  defaultCategoryId,
  categories,
  onClose,
  onSaved,
  onDelete,
}: {
  /** null = adding a new item; an AdminMenuItem = editing that one. */
  item: AdminMenuItem | null | undefined;
  defaultCategoryId: number;
  categories: AdminMenuCategory[];
  onClose: () => void;
  onSaved: () => void;
  /** Removes the item with the same undo-toast flow as the table's inline delete — no confirm step needed here either. */
  onDelete: (item: AdminMenuItem) => void;
}) {
  const { toast } = useToast();
  const open = item !== undefined;
  const isEditing = Boolean(item);
  const [draft, setDraft] = useState<DraftState>(() => draftFor(item ?? null, defaultCategoryId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(draftFor(item ?? null, defaultCategoryId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, open]);

  function toggleBadge(badge: AdminMenuBadge) {
    setDraft((d) => ({
      ...d,
      badges: d.badges.includes(badge) ? d.badges.filter((b) => b !== badge) : [...d.badges, badge],
    }));
  }

  async function save() {
    const price = Number(draft.price);
    if (!draft.name.trim()) {
      toast({ title: "Name required", description: "Give the dish a name first.", variant: "error" });
      return;
    }
    if (!draft.description.trim()) {
      toast({ title: "Description required", description: "Guests see this when they tap the dish.", variant: "error" });
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Enter a price greater than zero.", variant: "error" });
      return;
    }

    setSaving(true);
    const payload = {
      categoryId: draft.categoryId,
      branch: draft.branchScope === "BOTH" ? null : draft.branchScope,
      name: draft.name.trim(),
      description: draft.description.trim(),
      price,
      veg: draft.veg,
      badges: draft.badges,
    };

    try {
      if (isEditing && item) {
        await api.patch(`/admin/menu/items/${item.id}`, payload);
        toast({ title: "Dish updated", description: draft.name, variant: "success" });
      } else {
        await api.post("/admin/menu/items", payload);
        toast({ title: "Dish added", description: draft.name, variant: "success" });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!item) return;
    onDelete(item);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-border bg-card p-6 shadow-lift"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl text-gradient-ember">
                {isEditing ? "Edit Dish" : "Add a Dish"}
              </h2>
              <motion.button
                onClick={onClose}
                aria-label="Close"
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</span>
                <select
                  value={draft.categoryId}
                  onChange={(e) => setDraft((d) => ({ ...d, categoryId: Number(e.target.value) }))}
                  className="field"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dish name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="field"
                  placeholder="e.g. Butter Chicken Deluxe"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                  className="field resize-none"
                  placeholder="e.g. Chef's special of the week — slow-cooked in a smoky tomato-butter gravy."
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price (ZMW)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.price}
                    onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                    className="field"
                    placeholder="0.00"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branch</span>
                  <select
                    value={draft.branchScope}
                    onChange={(e) => setDraft((d) => ({ ...d, branchScope: e.target.value as BranchScope }))}
                    className="field"
                  >
                    <option value="BOTH">Both branches</option>
                    <option value="LUSAKA">Lusaka only</option>
                    <option value="KITWE">Kitwe only</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={draft.veg}
                  onChange={(e) => setDraft((d) => ({ ...d, veg: e.target.checked }))}
                  className="h-4 w-4 rounded border-border accent-emerald-500"
                />
                <Leaf className="h-3.5 w-3.5 text-emerald-400" />
                Vegetarian
              </label>

              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Badges (optional)
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALL_MENU_BADGES.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => toggleBadge(badge)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        draft.badges.includes(badge)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="bg-gradient-ember shadow-warm flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Dish"}
              </button>

              {isEditing && (
                <button
                  onClick={remove}
                  disabled={saving}
                  aria-label="Remove dish"
                  className="flex items-center justify-center rounded-full border border-destructive/40 p-3 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
