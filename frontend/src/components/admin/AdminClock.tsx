import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const dateFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** A live-ticking clock — small "ops center" touch for the admin header. */
export function AdminClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden flex-col items-end leading-tight lg:flex">
      <span className="font-display text-sm tabular-nums text-foreground">{formatter.format(now)}</span>
      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{dateFormatter.format(now)}</span>
    </div>
  );
}
