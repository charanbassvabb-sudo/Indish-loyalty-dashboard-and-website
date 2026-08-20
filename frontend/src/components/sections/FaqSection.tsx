import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Branch } from "@/types";

export function FaqSection({ branch }: { branch: Branch }) {
  const faqs = [
    {
      q: "Is there parking?",
      a: branch.seating.includes("outdoor")
        ? "Yes — free parking is available at EastPark Mall, a short walk from the restaurant entrance."
        : "Yes — free parking is available at ECL Mall, right by the restaurant entrance.",
    },
    {
      q: "Is there a dress code?",
      a: "We're smart-casual. Come as you are — just no swimwear or bare feet in the dining room.",
    },
    {
      q: "Are kids welcome?",
      a: "Absolutely. We have a children's menu on request and high chairs available at both branches.",
    },
    {
      q: "Can you host large groups or private parties?",
      a: "Yes — select \"Party / Celebration\" when reserving for 8 or more guests and our team will confirm seating and any setup needs directly.",
    },
    {
      q: "Do you cater to dietary requirements?",
      a: "Most dishes can be adapted for vegetarian, vegan, or reduced-spice preferences — look for the Veg tag on the menu, or tell your server about allergies when you arrive.",
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 md:px-10">
      <div className="mb-10 text-center">
        <span className="eyebrow">Good to Know</span>
        <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
          Frequently asked <span className="text-gradient-ember">questions</span>
        </h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="card-warm px-6 py-2 md:px-8"
      >
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.q} value={`faq-${i}`}>
              <AccordionTrigger className="font-display text-base text-foreground md:text-lg">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}
