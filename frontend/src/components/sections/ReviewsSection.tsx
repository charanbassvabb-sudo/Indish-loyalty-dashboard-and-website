import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Branch } from "@/types";

const sampleReviews: Record<Branch["id"], { name: string; quote: string; rating: number }[]> = {
  // Real guest reviews (lightly copy-edited for spelling/grammar only — the
  // dishes mentioned and sentiment are exactly as written). Sourced from
  // https://www.tripadvisor.com/Restaurant_Review-g293843-d23922692-Reviews-Indish-Lusaka_Lusaka_Province.html
  // — a proper Google-reviews auto-sync (via the Places API) is planned for
  // later; for now these are updated by hand.
  lusaka: [
    {
      name: "Christabel M.",
      quote: "Fantastic presentation of food — we enjoyed every dish at Indish. We tried the baked chicken kebab, cheese herb balls, and Chicken Maharaja with layered naan. Thanks for the delicious food and service!",
      rating: 5,
    },
    {
      name: "Clarina E.",
      quote: "Some of the best Indian and Chinese food in Lusaka. We sat out in the open air — the setting was comfortable, the food flavourful, and the portions generous. The interior is elegant with plenty of seating.",
      rating: 5,
    },
    {
      name: "Rajendra M.",
      quote: "Great multi-cuisine food at East Park Mall. Try the mutton seekh kebab, tandoori mushrooms, fusion pizzas, and lots more.",
      rating: 5,
    },
  ],
  kitwe: [
    {
      name: "Mutale C.",
      quote: "Hyderabadi biryani here rivals anything I've had in Lusaka. Portions are generous and consistent.",
      rating: 5,
    },
    {
      name: "Joseph T.",
      quote: "Cosy indoor room, great for a quiet family dinner after work. The dal makhani is a must.",
      rating: 4,
    },
    {
      name: "Ruth L.",
      quote: "Chicken 65 and the masala shandy — my go-to order every time I'm in Kitwe.",
      rating: 5,
    },
  ],
};

export function ReviewsSection({ branch }: { branch: Branch }) {
  const reviews = sampleReviews[branch.id];

  return (
    <section id="reviews" className="scroll-mt-24 border-y border-border bg-card/40 py-24">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="eyebrow">What guests say</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            {branch.rating} out of 5
          </h2>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(branch.rating) ? "fill-primary text-primary" : "text-border"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            From {branch.reviewCount} verified reviews
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {reviews.map((review, i) => (
            <motion.figure
              key={review.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="card-warm flex flex-col gap-4 p-6"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-foreground">
                "{review.quote}"
              </blockquote>
              <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {review.name}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
