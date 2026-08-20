import type { HTMLAttributes } from "react";

/**
 * Shimmering placeholder block — swap in wherever content is still loading
 * (admin reports, tables, images) instead of a blank flash or "Loading..."
 * text. See the `skeleton` utility in index.css for the animation.
 */
export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`skeleton ${className}`} {...props} />;
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
