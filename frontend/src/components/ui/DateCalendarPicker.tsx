import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DateAvailability {
  disabled: boolean;
  reason?: string;
}

interface DateCalendarPickerProps {
  /** Selected date, ISO "YYYY-MM-DD", or "" for none selected. */
  value: string;
  onChange: (date: string) => void;
  /** Inclusive ISO bounds — dates outside this range are never selectable, mirroring how a flight search calendar greys out days with no available flights instead of letting you pick one and only then telling you it's invalid. */
  minDate: string;
  maxDate: string;
  /** Extra per-date exclusion on top of the min/max window, e.g. a recurring closure day. */
  isDateDisabled?: (date: string) => DateAvailability;
  helperText?: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonthUTC(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Month-grid date picker that never lets an out-of-window or closed date be
 * clicked — the native <input type="date"> calendar can't enforce that
 * reliably (iOS Safari in particular lets the wheel scroll straight past
 * min/max), so this replaces it everywhere a booking window needs to be a
 * hard, visible constraint rather than a post-submit validation error.
 */
export function DateCalendarPicker({
  value,
  onChange,
  minDate,
  maxDate,
  isDateDisabled,
  helperText,
}: DateCalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonthUTC(value || minDate));

  const minMonth = startOfMonthUTC(minDate);
  const maxMonth = startOfMonthUTC(maxDate);
  const canGoPrev = viewMonth.getTime() > minMonth.getTime();
  const canGoNext = viewMonth.getTime() < maxMonth.getTime();

  const year = viewMonth.getUTCFullYear();
  const month = viewMonth.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayISO = toISO(new Date());

  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(Date.UTC(year, month, i + 1)))),
  ];

  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => setViewMonth(new Date(Date.UTC(year, month - 1, 1)))}
          aria-label="Previous month"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
        </span>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => setViewMonth(new Date(Date.UTC(year, month + 1, 1)))}
          aria-label="Next month"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const outOfWindow = date < minDate || date > maxDate;
          const availability = !outOfWindow ? isDateDisabled?.(date) : undefined;
          const disabled = outOfWindow || !!availability?.disabled;
          const selected = value === date;
          const isToday = date === todayISO;
          const dayNum = Number(date.slice(-2));
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              title={availability?.reason}
              onClick={() => onChange(date)}
              className={`relative aspect-square rounded-lg text-xs font-medium transition-colors ${
                selected
                  ? "bg-gradient-ember text-primary-foreground shadow-warm"
                  : disabled
                    ? "cursor-not-allowed text-muted-foreground/30 line-through"
                    : "text-foreground hover:bg-primary/10 hover:text-primary"
              } ${isToday && !selected ? "ring-1 ring-inset ring-primary/50" : ""}`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {helperText && <p className="mt-3 text-center text-[0.7rem] text-muted-foreground">{helperText}</p>}
    </div>
  );
}
