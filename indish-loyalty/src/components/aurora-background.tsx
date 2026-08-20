/**
 * Slow-drifting ambient gradient blobs for the Noir & Gold theme. Pure CSS
 * animation (see aurora-drift-a/b in styles.css) — no per-frame JS, cheap to
 * leave mounted behind scrollable content.
 */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-1/4 -top-1/4 h-[70vw] w-[70vw] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.78 0.13 85) 0%, transparent 70%)",
          animation: "aurora-drift-a 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-1/4 top-1/3 h-[60vw] w-[60vw] rounded-full opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.22 320) 0%, transparent 70%)",
          animation: "aurora-drift-b 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[50vw] w-[50vw] rounded-full opacity-10 blur-3xl"
        style={{
          background: "radial-gradient(circle, oklch(0.7 0.14 155) 0%, transparent 70%)",
          animation: "aurora-drift-a 30s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
