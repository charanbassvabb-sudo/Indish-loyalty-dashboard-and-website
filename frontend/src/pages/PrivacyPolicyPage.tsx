import { motion } from "framer-motion";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "What we collect",
    body: (
      <>
        When you reserve a table we collect your name, mobile number, email address, party size,
        and any notes you add (e.g. an occasion or dietary request). If you pay a deposit by Airtel
        Money or MTN MoMo, we ask you to upload a screenshot of the payment confirmation so we can
        verify it — that screenshot, and the amount, transaction ID, and phone numbers our system
        reads from it, are stored against your booking.
      </>
    ),
  },
  {
    heading: "How we use it",
    body: (
      <>
        Solely to run your reservation: confirming your table, verifying your deposit, and sending
        you WhatsApp updates about your booking (created, payment verified, confirmed, or if we need
        a clearer screenshot). We don't sell, rent, or use your information for advertising, and we
        don't share it with anyone outside Indish except where the law requires it.
      </>
    ),
  },
  {
    heading: "Payment screenshots",
    body: (
      <>
        Screenshots are read automatically by software on our own server to confirm a payment — they
        are never sent to Airtel, MTN, or any third party, and no one outside our booking team can
        view them. If our system can't confidently match a screenshot to your booking, a staff member
        reviews it manually before your table is confirmed.
      </>
    ),
  },
  {
    heading: "Who can see your data",
    body: (
      <>
        Only authenticated Indish staff with an admin login can view reservation and payment details,
        and every login is logged. We do not use third-party analytics or advertising cookies on this
        site.
      </>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <>
        Reservation and payment records are kept for our accounting and dispute-resolution records.
        If you'd like your data reviewed, corrected, or deleted, contact us using the details below and
        we'll action it, subject to any records we're legally required to retain.
      </>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <>
        Under Zambia's Data Protection Act, 2021, you can ask what personal data we hold about you,
        request a correction, or request deletion. Reach out via WhatsApp or phone (see our{" "}
        <a href="tel:+260976309999" className="text-primary underline underline-offset-2">
          Lusaka
        </a>{" "}
        or{" "}
        <a href="tel:+260963240240" className="text-primary underline underline-offset-2">
          Kitwe
        </a>{" "}
        branch numbers) and we'll respond promptly.
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  useDocumentMeta({
    title: "Privacy Policy | Indish",
    description: "How Indish collects, uses, and protects your personal information when you reserve a table or pay a deposit.",
    canonical: "https://www.indishzambia.com/privacy-policy",
  });

  return (
    <div className="pt-32 pb-24">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="eyebrow block text-center"
        >
          Indish
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-center font-display text-4xl text-foreground md:text-5xl"
        >
          Privacy Policy
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-center text-sm text-muted-foreground"
        >
          Last updated {new Date().toLocaleDateString("en-ZM", { year: "numeric", month: "long", day: "numeric" })}
        </motion.p>

        <div className="mt-12 space-y-8">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.heading}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="card-warm p-6"
            >
              <h2 className="font-display text-xl text-foreground">{s.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
}
