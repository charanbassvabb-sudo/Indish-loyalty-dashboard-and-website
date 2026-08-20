import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Save } from "lucide-react";
import { api } from "@/lib/api";
import type { DailyAvailabilityEntry } from "@/types/admin";

const todayISO = new Date().toISOString().slice(0, 10);

export function AdminAvailabilityTab() {
  const [entries, setEntries] = useState<DailyAvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [branch, setBranch] = useState<"LUSAKA" | "KITWE">("LUSAKA");
  const [date, setDate] = useState(todayISO);
  const [seatsLeft, setSeatsLeft] = useState<string>("");
  const [fullyBooked, setFullyBooked] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<{ availability: DailyAvailabilityEntry[] }>("/admin/availability")
      .then((res) => setEntries(res.availability))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/admin/availability", {
        branch,
        date,
        seatsLeft: seatsLeft === "" ? null : Number(seatsLeft),
        fullyBooked,
        note: note || undefined,
      });
      setNote("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    await api.delete(`/admin/availability/${id}`);
    setEntries((e) => e.filter((entry) => entry.id !== id));
  }

  return (
    <div>
      <div className="card-warm mb-6 p-6">
        <h3 className="mb-1 font-display text-xl text-foreground">Set today's availability</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Publish how many seats are left, or mark a branch fully booked, for a specific date.
          This shows as a banner on the public reservation page.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branch</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value as "LUSAKA" | "KITWE")} className="field">
              <option value="LUSAKA">Lusaka</option>
              <option value="KITWE">Kitwe</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seats left</span>
            <input
              type="number"
              min={0}
              value={seatsLeft}
              onChange={(e) => setSeatsLeft(e.target.value)}
              placeholder="Leave blank if not tracked"
              className="field"
              disabled={fullyBooked}
            />
          </label>
          <label className="flex items-end gap-2 pb-2.5">
            <input
              type="checkbox"
              checked={fullyBooked}
              onChange={(e) => setFullyBooked(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm text-foreground">Mark fully booked</span>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Note (optional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Private event 6–9pm"
            className="field"
          />
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="btn-shine bg-gradient-ember shadow-warm mt-5 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save availability"}
        </button>
      </div>

      <div className="card-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No availability overrides set yet.
                  </td>
                </tr>
              )}
              {!loading &&
                entries.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60"
                  >
                    <td className="px-5 py-3 text-foreground">{e.branch === "LUSAKA" ? "Lusaka" : "Kitwe"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.date}</td>
                    <td className="px-5 py-3">
                      {e.fullyBooked ? (
                        <span className="rounded-full bg-destructive/15 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-destructive">
                          Fully booked
                        </span>
                      ) : e.seatsLeft !== null ? (
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                          {e.seatsLeft} seats left
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not tracked</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{e.note || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => remove(e.id)}
                        aria-label="Delete"
                        className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
