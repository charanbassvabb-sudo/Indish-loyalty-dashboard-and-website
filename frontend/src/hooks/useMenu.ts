import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BranchId, MenuCategory } from "@/types";

// Module-level cache (not React state) so navigating Home -> Menu for the
// same branch doesn't re-fetch ~190 items every time — the admin dashboard
// is the only thing that ever changes this data, and a full page reload
// (or just re-navigating to a fresh tab) is an acceptable way to pick up an
// edit, matching how the rest of the site treats admin-edited content.
const cache = new Map<BranchId, MenuCategory[]>();
const inFlight = new Map<BranchId, Promise<MenuCategory[]>>();

function fetchMenu(branchId: BranchId): Promise<MenuCategory[]> {
  const cached = cache.get(branchId);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(branchId);
  if (pending) return pending;

  const promise = api
    .get<{ categories: MenuCategory[] }>(`/menu?branch=${branchId.toUpperCase()}`)
    .then((res) => {
      cache.set(branchId, res.categories);
      inFlight.delete(branchId);
      return res.categories;
    })
    .catch((err) => {
      inFlight.delete(branchId);
      throw err;
    });

  inFlight.set(branchId, promise);
  return promise;
}

/** The live, admin-editable menu for a branch — see menu.controller.ts / AdminMenuTab. */
export function useMenu(branchId: BranchId | undefined) {
  const [categories, setCategories] = useState<MenuCategory[]>(() => (branchId ? (cache.get(branchId) ?? []) : []));
  const [loading, setLoading] = useState(() => Boolean(branchId) && !cache.has(branchId!));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;

    const cached = cache.get(branchId);
    if (cached) {
      setCategories(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMenu(branchId)
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load the menu right now. Please refresh the page.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return { categories, loading, error };
}
