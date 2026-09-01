import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, CheckCircle2, PartyPopper } from "lucide-react";
import { branches } from "@/data/branches";
import type { BranchId } from "@/types";
import { api, ApiRequestError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

interface CateringItemDto {
  id: number;
  name: string;
  quantity: string;
}

interface CateringCategoryDto {
  id: number;
  name: string;
  items: CateringItemDto[];
}

interface CateringPackageDto {
  id: number;
  tier: Tier;
  name: string;
  description: string | null;
  priceNote: string | null;
  categories: CateringCategoryDto[];
}

const TIER_STYLE: Record<Tier, string> = {
  BRONZE: "border-amber-700/40 bg-amber-700/10 text-amber-500",
  SILVER: "border-slate-400/40 bg-slate-400/10 text-slate-300",
  GOLD: "border-gold/50 bg-gold/10 text-gold",
  PLATINUM: "border-primary/50 bg-primary/10 text-primary",
};

interface FormState {
  customerName: string;
  phone: string;
  eventDate: string;
  guestCount: string;
  notes: string;
}

const emptyForm: FormState = { customerName: "", phone: "", eventDate: "", guestCount: "", notes: "" };

export default function CateringPage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const { toast } = useToast();

  const [packages, setPackages] = useState<CateringPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTier, setOpenTier] = useState<Tier | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | "">("");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useDocumentMeta({
    title: branch ? `Catering | ${branch.name}` : "Catering | Indish",
    description: branch
      ? `Browse our Bronze, Silver, Gold, and Platinum catering packages and send an enquiry for your event at ${branch.name}.`
      : undefined,
  });

  useEffect(() => {
    api
      .get<{ packages: CateringPackageDto[] }>("/catering/packages")
      .then((res) => {
        setPackages(res.packages);
        if (res.packages[0]) setOpenTier(res.packages[0].tier);
      })
      .catch(() => toast({ title: "Couldn't load catering packages", description: "Please try again.", variant: "error" }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (!branch) return <Navigate to="/" replace />;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectTier(pkg: CateringPackageDto) {
    setOpenTier((t) => (t === pkg.tier ? null : pkg.tier));
    setSelectedPackageId(pkg.id);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.customerName.trim().length < 2) next.customerName = "Name must be at least 2 characters";
    if (form.phone.replace(/\D/g, "").length < 9) next.phone = "Phone must have at least 9 digits";
    if (!form.eventDate) next.eventDate = "Please choose an event date";
    const guests = Number(form.guestCount);
    if (!guests || guests < 1) next.guestCount = "Enter the number of guests";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post("/catering/enquiries", {
        branch: branch!.id.toUpperCase(),
        packageId: selectedPackageId || undefined,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        eventDate: form.eventDate,
        guestCount: Number(form.guestCount),
        notes: form.notes.trim() || undefined,
      });
      setSubmitted(true);
      setForm(emptyForm);
    } catch (err) {
      toast({
        title: "Couldn't send your enquiry",
        description:
          err instanceof ApiRequestError ? err.message : "Something went wrong. Please check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-0">
      <div className="mb-10 text-center">
        <span className="eyebrow">{branch.name}</span>
        <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Catering Packages</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          Browse our packages below and send us an enquiry — our team will follow up by phone to confirm details and
          pricing for your event.
        </p>
      </div>

      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading catering packages" />
        </div>
      )}

      {!loading && (
        <div className="mb-12 flex flex-col gap-4">
          {packages.map((pkg) => {
            const open = openTier === pkg.tier;
            return (
              <div key={pkg.id} className="card-warm overflow-hidden">
                <button
                  type="button"
                  onClick={() => selectTier(pkg)}
                  className="flex w-full items-center justify-between gap-3 p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${TIER_STYLE[pkg.tier]}`}>
                      {pkg.tier}
                    </span>
                    <div>
                      <p className="font-display text-lg text-foreground">{pkg.name}</p>
                      {pkg.priceNote && <p className="text-xs text-muted-foreground">{pkg.priceNote}</p>}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border p-5 pt-4">
                        {pkg.description && <p className="mb-4 text-sm text-muted-foreground">{pkg.description}</p>}
                        <div className="grid gap-4 sm:grid-cols-2">
                          {pkg.categories.map((cat) => (
                            <div key={cat.id}>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">{cat.name}</p>
                              <ul className="flex flex-col gap-1 text-sm text-foreground">
                                {cat.items.map((item) => (
                                  <li key={item.id} className="flex items-baseline justify-between gap-2">
                                    <span>{item.name}</span>
                                    <span className="text-xs text-muted-foreground">{item.quantity}</span>
                                  </li>
                                ))}
                                {cat.items.length === 0 && <li className="text-xs text-muted-foreground">Coming soon</li>}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {packages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Catering packages aren't listed yet — please contact us directly.</p>
          )}
        </div>
      )}

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-warm flex flex-col items-center gap-4 p-10 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <div>
            <p className="eyebrow">Enquiry Sent</p>
            <h2 className="mt-2 font-display text-2xl text-foreground">We'll be in touch</h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Thanks for reaching out — our team at {branch.name} will call you shortly to confirm details and pricing
            for your event.
          </p>
        </motion.div>
      ) : (
        <div className="card-warm p-6">
          <div className="mb-5 flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">Send an Enquiry</h2>
          </div>

          <div className="flex flex-col gap-4">
            {packages.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package</span>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value ? Number(e.target.value) : "")}
                  className="field"
                >
                  <option value="">Not sure yet</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tier} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</span>
              <input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} className="field" placeholder="Your name" />
              {errors.customerName && <span className="text-xs text-destructive">{errors.customerName}</span>}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</span>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="field" placeholder="09XXXXXXXX" />
              {errors.phone && <span className="text-xs text-destructive">{errors.phone}</span>}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event Date</span>
                <input type="date" min={today} value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} className="field" />
                {errors.eventDate && <span className="text-xs text-destructive">{errors.eventDate}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest Count</span>
                <input
                  type="number"
                  min="1"
                  value={form.guestCount}
                  onChange={(e) => update("guestCount", e.target.value)}
                  className="field"
                  placeholder="e.g. 50"
                />
                {errors.guestCount && <span className="text-xs text-destructive">{errors.guestCount}</span>}
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="field resize-none"
                placeholder="Tell us about your event"
              />
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-shine bg-gradient-ember shadow-warm self-start rounded-full px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send Enquiry"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
