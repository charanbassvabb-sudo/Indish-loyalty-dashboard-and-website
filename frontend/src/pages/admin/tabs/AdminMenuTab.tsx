import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Leaf, UtensilsCrossed, Trash2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { MenuItemDrawer } from "@/components/admin/MenuItemDrawer";
import { formatMenuPrice } from "@/lib/utils";
import type { AdminMenuCategory, AdminMenuItem, AdminMenuResponse } from "@/types/admin";

/** How long a removed dish waits before it's actually deleted server-side —
 *  clicking Undo within this window cancels it for free (the DELETE never fires). */
const UNDO_WINDOW_MS = 5500;

interface PendingDelete {
  timeoutId: number;
  item: AdminMenuItem;
  categoryId: number;
  index: number;
}

const badgeStyles: Record<string, string> = {
  Signature: "bg-gradient-ember text-primary-foreground",
  "Guest Favourite": "bg-secondary text-secondary-foreground border border-primary/40",
  "Most Ordered": "bg-accent text-accent-foreground",
  "Chef's Special": "bg-gold text-background border border-gold",
};

const branchLabel: Record<string, string> = {
  LUSAKA: "Lusaka only",
  KITWE: "Kitwe only",
};

export function AdminMenuTab() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<AdminMenuCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // undefined = drawer closed, null = adding, an item = editing that item
  const [editing, setEditing] = useState<AdminMenuItem | null | undefined>(undefined);
  // Deliberately NOT cleared on unmount (switching tabs) — a delete the
  // admin actually clicked should still go through in the background; only
  // clicking Undo itself should cancel it.
  const pendingDeletes = useRef(new Map<number, PendingDelete>());

  function load() {
    setLoading(true);
    api
      .get<AdminMenuResponse>("/admin/menu")
      .then((res) => {
        setCategories(res.categories);
        setActiveCategoryId((current) => current ?? res.categories[0]?.id ?? null);
      })
      .catch(() => toast({ title: "Couldn't load the menu", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const active = categories.find((c) => c.id === activeCategoryId) ?? categories[0];

  function deleteItemWithUndo(item: AdminMenuItem) {
    const index = categories.find((c) => c.id === item.categoryId)?.items.findIndex((i) => i.id === item.id) ?? -1;

    // Optimistic local removal — no confirm dialog, no round trip yet.
    setCategories((cats) =>
      cats.map((c) => (c.id === item.categoryId ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c)),
    );

    const timeoutId = window.setTimeout(async () => {
      pendingDeletes.current.delete(item.id);
      try {
        await api.delete(`/admin/menu/items/${item.id}`);
      } catch (err) {
        // The undo window closed but the server never actually got the
        // delete — put it back rather than leaving the admin's screen
        // silently out of sync with what's really still on the menu.
        toast({
          title: "Couldn't remove dish",
          description: err instanceof ApiRequestError ? err.message : `${item.name} — please try again.`,
          variant: "error",
        });
        load();
      }
    }, UNDO_WINDOW_MS);

    pendingDeletes.current.set(item.id, { timeoutId, item, categoryId: item.categoryId, index });

    toast({
      title: "Dish removed",
      description: item.name,
      variant: "info",
      duration: UNDO_WINDOW_MS + 500,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletes.current.get(item.id);
          if (!pending) return;
          window.clearTimeout(pending.timeoutId);
          pendingDeletes.current.delete(item.id);
          setCategories((cats) =>
            cats.map((c) => {
              if (c.id !== pending.categoryId) return c;
              const items = [...c.items];
              items.splice(Math.min(pending.index, items.length), 0, pending.item);
              return { ...c, items };
            }),
          );
        },
      },
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          Add, edit, or remove dishes — changes go live on the public menu immediately. Use{" "}
          <strong className="text-foreground">Chef's Specials</strong> for anything temporary; it only shows up
          on the site while it has dishes in it.
        </p>
        <button
          onClick={() => setEditing(null)}
          disabled={!active}
          className="bg-gradient-ember shadow-warm flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add a Dish
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Menu categories"
            className="mb-6 flex flex-wrap gap-2 border-b border-border pb-6"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={cat.id === activeCategoryId}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  cat.id === activeCategoryId
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.id === activeCategoryId && (
                  <motion.span
                    layoutId="admin-menu-tab-bg"
                    className="bg-gradient-ember absolute inset-0 rounded-full"
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {cat.label}
                  <span
                    className={`rounded-full px-1.5 text-[0.65rem] ${
                      cat.id === activeCategoryId ? "text-primary-foreground/80" : "text-muted-foreground/70"
                    }`}
                  >
                    {cat.items.length}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="card-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-card/95 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Dish</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Tags</th>
                    <th className="px-5 py-3">Scope</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {active?.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                        <UtensilsCrossed className="mx-auto mb-2 h-6 w-6" />
                        Nothing in {active.label} yet — add the first dish.
                      </td>
                    </tr>
                  )}
                  {active?.items.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setEditing(item)}
                      className={`group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/60 ${
                        i % 2 === 1 ? "bg-background/30" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-border" />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              {item.veg && <Leaf className="h-3 w-3 shrink-0 text-emerald-400" />}
                              {item.name}
                            </div>
                            <div className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-foreground">{formatMenuPrice(item)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.badges.map((b) => (
                            <span
                              key={b}
                              className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${badgeStyles[b]}`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {item.branch ? branchLabel[item.branch] : "Both branches"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItemWithUndo(item);
                          }}
                          aria-label={`Remove ${item.name}`}
                          className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <MenuItemDrawer
        key={editing === undefined ? "closed" : (editing?.id ?? "new")}
        item={editing}
        defaultCategoryId={active?.id ?? categories[0]?.id ?? 0}
        categories={categories}
        onClose={() => setEditing(undefined)}
        onSaved={load}
        onDelete={deleteItemWithUndo}
      />
    </div>
  );
}
