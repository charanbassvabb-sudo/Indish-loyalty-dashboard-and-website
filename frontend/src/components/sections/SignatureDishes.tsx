import { motion } from "framer-motion";
import type { MenuCategory, MenuItem } from "@/types";
import heroIndish from "@/assets/images/hero-indish.jpg";
import { BlurImage } from "@/components/ui/BlurImage";
import { useTiltSpotlight } from "@/hooks/useTiltSpotlight";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function SignatureDishes({ categories }: { categories: MenuCategory[] }) {
  const highlights = categories
    .flatMap((category) => category.items.map((item) => ({ ...item, category: category.label })))
    .filter((item) => item.badges && item.badges.length > 0)
    .slice(0, 6);

  if (highlights.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 1.06 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="group relative aspect-[4/5] overflow-hidden rounded-3xl"
        >
          <BlurImage
            src={heroIndish}
            alt="Signature dishes plated at Indish"
            placeholderKey="hero-indish.jpg"
            className="h-full w-full"
            imgClassName="transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <div className="bg-veil absolute inset-0" />
        </motion.div>

        <div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow">Guest favourites</span>
            <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
              Signature dishes
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
              The plates our regulars order again and again — hand-picked from every corner of
              the menu.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {highlights.map((dish, i) => (
              <SignatureDishCard key={dish.id} dish={dish} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SignatureDishCard({ dish, index }: { dish: MenuItem & { category: string }; index: number }) {
  const tilt = useTiltSpotlight<HTMLDivElement>({ max: 5 });

  return (
    <motion.div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      style={tilt.style}
      className="card-warm spotlight-card group p-5 transition-colors hover:border-primary/60"
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">{dish.name}</h3>
        <span className="whitespace-nowrap font-display text-primary">ZMW {dish.price}</span>
      </div>
      {dish.badges && (
        <span className="relative z-10 mt-1 inline-block text-xs font-semibold uppercase tracking-wide text-primary">
          {dish.badges[0]}
        </span>
      )}
      <p className="relative z-10 mt-2 text-sm text-muted-foreground">{dish.description}</p>
    </motion.div>
  );
}
