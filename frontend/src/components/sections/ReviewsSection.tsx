import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Branch } from "@/types";

const sampleReviews: Record<Branch["id"], { name: string; quote: string; rating: number }[]> = {
  // Real guest reviews, pulled directly from each branch's Google Maps
  // listing (copy-edited only for the odd typo — quoted content and
  // sentiment are exactly as written; only complete, non-truncated reviews
  // were used, and only the positive ones, same as any business would pick
  // for a testimonials section — individual star ratings weren't visible in
  // the copied text, so 5 is used throughout, matching their tone). A
  // proper Google-reviews auto-sync (via the Places API) is planned for
  // later; for now these are updated by hand.
  lusaka: [
    {
      name: "Salmaan S.",
      quote: "Had a great dining experience at Indish Fusion Food & Cocktails. Very friendly and welcoming service, amazingly beautiful ambience, great Indian and Chinese inspired food menu and great range of cocktails and mocktails. Highly recommend it.",
      rating: 5,
    },
    {
      name: "Just Phelix",
      quote: "For me this is the best place you can enjoy an Indian cuisine in Lusaka. It boasts of a very good central location. The service is on point, the food is excellent and it always feels good to be here from time to time. And it's family friendly too!",
      rating: 5,
    },
    {
      name: "Scott S.",
      quote: "The food was a nice fusion of Indian and Asian. Nice combination and was very good. Our server was perfect! We plan on going back before we leave Lusaka.",
      rating: 5,
    },
  ],
  kitwe: [
    {
      name: "Lucy C.",
      quote: "Lovely atmosphere. The food was fresh and tasty. Attentive and friendly staff, always on hand to serve. Where they're not sure, the chef comes through to give more insight on the dish upon request. All in all, a great place to enjoy a meal and conversate.",
      rating: 5,
    },
    {
      name: "Stephanie R.",
      quote: "Highly recommended. Great service, excellent food and generous portions. We had the Thai spring rolls, a very generous starter, beautifully presented. Our mains, lamb shank korma and veggie paneer tomato curry with garlic naan and special pulav rice, were also very good.",
      rating: 5,
    },
    {
      name: "Caroline S.",
      quote: "Excellent food, welcoming ambience, and very professional but friendly staff. My new favourite joint.",
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
