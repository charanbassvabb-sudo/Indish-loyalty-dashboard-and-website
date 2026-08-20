import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Navigation, Sofa, CheckCircle2, Clock, Copy, Check } from "lucide-react";
import type { Branch } from "@/types";
import { useContentValue } from "@/context/SiteContentContext";
import { useToast } from "@/context/ToastContext";
import { MapEmbed } from "./MapEmbed";

export function ContactSection({ branch }: { branch: Branch }) {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const address = useContentValue("addressOverride", branch.id, branch.address);
  const phone = useContentValue("phoneOverride", branch.id, branch.phone);
  const hours = useContentValue("hoursText", branch.id, branch.hours);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: wire to POST /api/contact once the backend is available.
    setSent(true);
    toast({ title: "Message sent", description: `The ${branch.name} team will get back to you shortly.`, variant: "success" });
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      toast({ title: "Address copied", description: address, variant: "success" });
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy address", description: "Copy it manually instead.", variant: "error" });
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24 md:px-10">
      <div className="grid gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow">Find Us</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            Visit {branch.name}
          </h2>

          <ul className="mt-8 space-y-5 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block font-medium text-foreground">{address}</span>
                {branch.plusCode}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-primary" />
              <a href={`tel:${phone}`} className="hover:text-primary">
                {phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" />
              {hours}
            </li>
            <li className="flex items-center gap-3">
              <Sofa className="h-5 w-5 shrink-0 text-primary" />
              {branch.seating.includes("outdoor") ? "Indoor & outdoor patio seating" : "Indoor seating only"}
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.plusCode)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </a>
            <button
              type="button"
              onClick={copyAddress}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {addressCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {addressCopied ? "Copied" : "Copy Address"}
            </button>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="card-warm flex flex-col gap-4 p-8"
          aria-label="Contact and complaints form"
        >
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="font-display text-xl text-foreground">Message sent</p>
              <p className="text-sm text-muted-foreground">
                The {branch.name} team will get back to you shortly.
              </p>
            </div>
          ) : (
            <>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-primary/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email or phone
            </label>
            <input
              id="email"
              name="email"
              type="text"
              required
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-primary/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Message or complaint
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-primary/40 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-ember shadow-warm mt-2 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Send Message
          </button>
            </>
          )}
        </motion.form>
      </div>

      <MapEmbed branch={branch} />
    </section>
  );
}
