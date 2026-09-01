import { SPICE_LEVELS } from "@/data/takeaway";
import type { SpiceLevel } from "@/data/takeaway";

/** Clicking the already-selected level deselects it — spice level is optional (not every dish has one), never forced. */
export function SpiceLevelPicker({
  value,
  onChange,
  optional,
}: {
  value: SpiceLevel | null;
  onChange: (level: SpiceLevel | null) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Spice Level{optional ? " (optional)" : ""}
      </span>
      <div className="flex gap-2">
        {SPICE_LEVELS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(value === s.id ? null : s.id)}
            className={`flex-1 rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors ${
              value === s.id
                ? "border-primary bg-secondary text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
