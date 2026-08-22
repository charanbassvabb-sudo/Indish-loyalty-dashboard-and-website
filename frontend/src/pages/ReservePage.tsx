import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { branches } from "@/data/branches";
import { emptyReservationForm, isSlotBookable, isRecurringlyClosed, getRecurringClosureNote, MAX_ADVANCE_HOURS } from "@/data/reservation";
import type { ReservationFormData } from "@/data/reservation";
import { ReservationDetailsStep } from "@/components/reservation/ReservationDetailsStep";
import { ReservationPaymentStep, type PaymentUploadResult } from "@/components/reservation/ReservationPaymentStep";
import {
  ReservationConfirmationStep,
  type ReservationConfirmation,
} from "@/components/reservation/ReservationConfirmationStep";
import { api, ApiRequestError } from "@/lib/api";
import type { BranchId } from "@/types";
import { useToast } from "@/context/ToastContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type Step = 1 | 2 | 3;
type Errors = Partial<Record<keyof ReservationFormData, string>>;

interface CreatedBooking {
  reference: string;
  date: string;
  time: string;
  guests: number;
  seating: string;
  depositAmount: number;
}

function validateDetails(data: ReservationFormData, branchId: BranchId): Errors {
  const errors: Errors = {};
  if (data.customerName.trim().length < 2) errors.customerName = "Name must be at least 2 characters";
  if (data.phone.replace(/\D/g, "").length < 9) errors.phone = "Phone must have at least 9 digits";
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) errors.email = "Enter a valid email address";
  if (!data.date) errors.date = "Date is required";
  if (!data.time) errors.time = "Please select a time";
  if (data.date && data.time && !isSlotBookable(data.date, data.time, branchId)) {
    errors.date = isRecurringlyClosed(data.date, branchId)
      ? `${getRecurringClosureNote(branchId)} — please pick another date`
      : `Reservations can only be made up to ${MAX_ADVANCE_HOURS} hours in advance`;
  }
  if (data.guests < 1 || data.guests > 40) errors.guests = "Guests must be between 1 and 40";
  return errors;
}

export default function ReservePage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;

  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<ReservationFormData>(emptyReservationForm);
  const [errors, setErrors] = useState<Errors>({});
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [confirmation, setConfirmation] = useState<ReservationConfirmation | null>(null);

  useDocumentMeta({
    title: branch ? `Reserve a Table | ${branch.name}` : "Reserve a Table | Indish",
    description: branch
      ? `Book a table at ${branch.name} in three quick steps — pick a time, secure it with a small deposit, and you're set.`
      : undefined,
  });

  if (!branch) return <Navigate to="/" replace />;

  function update<K extends keyof ReservationFormData>(key: K, value: ReservationFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // The reservation itself is created here, at the end of step 1 — payment
  // is a genuinely separate step against an already-existing booking (see
  // ReservationPaymentStep.tsx), not bundled into the same request anymore.
  async function goToPayment() {
    const detailErrors = validateDetails(data, branch!.id);
    setErrors(detailErrors);
    if (Object.keys(detailErrors).length > 0) return;

    setCreatingBooking(true);
    try {
      const res = await api.post<CreatedBooking & { status: "PENDING_PAYMENT" }>("/reservations", {
        branch: branch!.id.toUpperCase(),
        bookingType: data.bookingType,
        eventType: data.bookingType === "PARTY" ? data.eventType || undefined : undefined,
        customerName: data.customerName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        guests: data.guests,
        date: data.date,
        time: data.time,
        seating: data.seating,
        occasion: data.occasion.trim() || undefined,
      });
      setBooking(res);
      setStep(2);
    } catch (err) {
      toast({
        title: "Couldn't start your booking",
        description:
          err instanceof ApiRequestError
            ? err.message
            : "Something went wrong. Please check your connection and try again.",
        variant: "error",
      });
    } finally {
      setCreatingBooking(false);
    }
  }

  function handleVerified(result: PaymentUploadResult) {
    if (!booking) return;
    setConfirmation({
      reference: booking.reference,
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      seating: booking.seating,
      depositAmount: booking.depositAmount,
      status: result.reservationStatus,
      internalPaymentId: result.internalPaymentId,
    });
    setStep(3);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:px-0">
      <div className="mb-10 text-center">
        <span className="eyebrow">{branch.name}</span>
        <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Reserve a Table</h1>

        {step < 3 && (
          <div className="mx-auto mt-8 flex max-w-xs items-center gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step >= s ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 1 && (
            <ReservationDetailsStep
              branch={branch}
              data={data}
              errors={errors}
              onChange={update}
              onNext={goToPayment}
              submitting={creatingBooking}
            />
          )}
          {step === 2 && booking && (
            <ReservationPaymentStep
              branchId={branch.id}
              reference={booking.reference}
              depositAmount={booking.depositAmount}
              onVerified={handleVerified}
            />
          )}
          {step === 3 && confirmation && (
            <ReservationConfirmationStep branch={branch} confirmation={confirmation} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
