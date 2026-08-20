import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users2, PartyPopper, CalendarClock } from "lucide-react";
import type { ReservationFormData, TimeSlot } from "@/data/reservation";
import { TIME_SLOTS, EVENT_TYPES, getSlotAvailability, isSlotBookable, MAX_ADVANCE_HOURS } from "@/data/reservation";
import type { Branch, BranchId } from "@/types";
import { api } from "@/lib/api";

interface Props {
  branch: Branch;
  data: ReservationFormData;
  errors: Partial<Record<keyof ReservationFormData, string>>;
  onChange: <K extends keyof ReservationFormData>(key: K, value: ReservationFormData[K]) => void;
  onNext: () => void;
  /** True while the reservation itself is being created on the server — see ReservePage.tsx. */
  submitting?: boolean;
}

// Reservations can only be made within a rolling 24h window, so the picker
// never needs to reach further than tomorrow's date.
const minISO = new Date().toISOString().slice(0, 10);
const maxISO = new Date(Date.now() + MAX_ADVANCE_HOURS * 60 * 60 * 1000).toISOString().slice(0, 10);

export function ReservationDetailsStep({ branch, data, errors, onChange, onNext, submitting }: Props) {
  // If the chosen date changes and the previously picked time falls outside
  // the 24h booking window for that date, clear it so the user has to re-pick.
  useEffect(() => {
    if (data.date && data.time && !isSlotBookable(data.date, data.time)) {
      onChange("time", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.date]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <BookingTypeCard
          active={data.bookingType === "STANDARD"}
          icon={<Users2 className="h-5 w-5" />}
          title="Standard Table"
          subtitle="Everyday dining for you and your guests"
          onClick={() => onChange("bookingType", "STANDARD")}
        />
        <BookingTypeCard
          active={data.bookingType === "PARTY"}
          icon={<PartyPopper className="h-5 w-5" />}
          title="Private Party / Family Booking"
          subtitle="Birthdays, family gatherings & celebrations"
          onClick={() => onChange("bookingType", "PARTY")}
        />
      </div>

      {data.bookingType === "PARTY" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="card-warm p-5"
        >
          <Field label="What are you celebrating?">
            <select
              value={data.eventType}
              onChange={(e) => onChange("eventType", e.target.value)}
              className="field"
            >
              <option value="">Select an occasion</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Our team will reach out to help plan seating, décor and timing for your group.
          </p>
        </motion.div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.customerName}>
          <input
            type="text"
            value={data.customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
            className="field"
            placeholder="e.g. Chanda Mwansa"
          />
        </Field>

        <Field label="Mobile number" error={errors.phone}>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="field"
            placeholder="09XXXXXXXX"
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            className="field"
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Number of guests" error={errors.guests}>
          <input
            type="number"
            min={1}
            max={40}
            value={data.guests}
            onChange={(e) => onChange("guests", Number(e.target.value))}
            className="field"
          />
        </Field>

        <Field label="Date" error={errors.date}>
          <input
            type="date"
            min={minISO}
            max={maxISO}
            value={data.date}
            onChange={(e) => onChange("date", e.target.value)}
            className="field"
          />
        </Field>
        <div className="sm:col-span-2">
          <AvailabilityNote branchId={branch.id} date={data.date} />
        </div>

        <Field label="Time" error={errors.time}>
          <select
            value={data.time}
            onChange={(e) => onChange("time", e.target.value as TimeSlot)}
            className="field"
          >
            <option value="">Select a time</option>
            {TIME_SLOTS.map((t) => {
              const availability = data.date ? getSlotAvailability(data.date, t) : "bookable";
              const bookable = availability === "bookable";
              return (
                <option key={t} value={t} disabled={!bookable}>
                  {t}
                  {availability === "past" ? " (already passed)" : ""}
                  {availability === "too-far" ? " (more than 24h away)" : ""}
                </option>
              );
            })}
          </select>
        </Field>

        <Field label="Seating preference">
          <select
            value={data.seating}
            onChange={(e) => onChange("seating", e.target.value as ReservationFormData["seating"])}
            className="field"
          >
            <option value="NO_PREFERENCE">No preference</option>
            <option value="INDOOR">Indoor</option>
            {branch.seating.includes("outdoor") && <option value="OUTDOOR">Outdoor patio</option>}
          </select>
        </Field>

        <Field label={data.bookingType === "PARTY" ? "Special requests" : "Occasion / notes"}>
          <input
            type="text"
            value={data.occasion}
            onChange={(e) => onChange("occasion", e.target.value)}
            className="field"
            placeholder={
              data.bookingType === "PARTY"
                ? "Decorations, cake, seating layout..."
                : "Birthday, anniversary, dietary notes..."
            }
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={submitting}
        className="btn-shine bg-gradient-ember shadow-warm mt-2 self-start rounded-full px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
      >
        {submitting ? "Starting your booking..." : "Continue to Payment"}
      </button>
    </div>
  );
}

function AvailabilityNote({ branchId, date }: { branchId: BranchId; date: string }) {
  const [status, setStatus] = useState<{ seatsLeft: number | null; fullyBooked: boolean; note: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (!date) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    api
      .get<{ availability: { seatsLeft: number | null; fullyBooked: boolean; note: string | null }[] }>(
        `/availability?branch=${branchId.toUpperCase()}&from=${date}&to=${date}`,
      )
      .then((res) => {
        if (!cancelled) setStatus(res.availability[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, date]);

  if (!status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${
        status.fullyBooked
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-primary/40 bg-primary/10 text-primary"
      }`}
    >
      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
      {status.fullyBooked
        ? `This date is fully booked at this branch${status.note ? ` — ${status.note}` : ""}. Please pick another date or call ahead.`
        : status.seatsLeft !== null
          ? `Only ${status.seatsLeft} seats left on this date${status.note ? ` — ${status.note}` : ""}.`
          : status.note}
    </motion.div>
  );
}

function BookingTypeCard({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          active ? "bg-gradient-ember text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}
