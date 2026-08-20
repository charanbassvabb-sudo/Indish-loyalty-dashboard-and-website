import { Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import { branches } from "@/data/branches";
import type { BranchId } from "@/types";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/** Zambian local numbers (0XXXXXXXXX) -> E.164 for wa.me / tel: links. */
function toIntl(phone: string) {
  return `260${phone.replace(/\D/g, "").replace(/^0/, "")}`;
}

const TOPICS = [
  "Food quality or an order that wasn't right",
  "Service at the table or on the phone",
  "A reservation or deposit/payment issue",
  "Anything else you'd like us to know",
];

export default function ComplaintsPage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;

  useDocumentMeta({
    title: branch ? `Complaints & Feedback | ${branch.name}` : "Complaints & Feedback | Indish",
    description: "Reach the Indish team directly about a complaint, feedback, or an issue with your visit or booking.",
    noindex: true,
  });

  if (!branch) return <Navigate to="/" replace />;

  const waHref = `https://wa.me/${toIntl(branch.phone)}?text=${encodeURIComponent(
    `Hi Indish ${branch.name.replace("Indish — ", "")}, I'd like to raise a complaint / give feedback about a recent visit.`,
  )}`;

  return (
    <div className="pt-32 pb-24">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          {branch.name}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 font-display text-4xl text-foreground md:text-5xl"
        >
          Complaints &amp; Feedback
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base"
        >
          Something not right? Tell us directly and a member of the {branch.name.replace("Indish — ", "")} team
          will get back to you personally — we'd rather hear it from you than not at all.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="card-warm mx-auto mt-10 max-w-lg p-6 text-left"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What can we help with?
          </p>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
            {TOPICS.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-ember shadow-warm flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              <MessageCircle className="h-4 w-4" />
              Message us on WhatsApp
            </a>
            <a
              href={`tel:+${toIntl(branch.phone)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Phone className="h-4 w-4" />
              Call {branch.phone}
            </a>
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
            {branch.hours} — messages sent outside these hours are picked up the next morning.
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            Payment or booking disputes are handled by our management team directly, not front-of-house staff.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
