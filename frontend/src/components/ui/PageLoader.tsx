import { Loader2 } from "lucide-react";

/**
 * Suspense fallback for lazy-loaded routes (see App.tsx). Route chunks are
 * small and cached after first visit, so this is typically on screen for a
 * few hundred ms at most — just enough to avoid a jarring blank frame while
 * the chunk downloads.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}
