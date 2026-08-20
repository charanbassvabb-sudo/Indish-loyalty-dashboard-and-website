import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { branches } from "@/data/branches";
import { useMenu } from "@/hooks/useMenu";
import { Hero } from "@/components/sections/Hero";
import { StatsBar } from "@/components/sections/StatsBar";
import { SignatureDishes } from "@/components/sections/SignatureDishes";
import { ReviewsSection } from "@/components/sections/ReviewsSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { MenuCard } from "@/components/sections/MenuCard";
import { MenuItemModal } from "@/components/sections/MenuItemModal";
import type { BranchId, MenuItem } from "@/types";
import { useDocumentMeta, buildRestaurantJsonLd } from "@/hooks/useDocumentMeta";

export default function HomePage() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const [selected, setSelected] = useState<MenuItem | null>(null);

  useDocumentMeta({
    title: branch ? `${branch.name} — Reserve a Table | Tandoor-Fired Indian Cuisine` : "Indish",
    description: branch
      ? `${branch.tagline}. ${branch.address}. Tandoor-fired, fusion-forward Indian cuisine — reserve a table online at ${branch.name}.`
      : undefined,
    jsonLd: branch ? buildRestaurantJsonLd(branch) : undefined,
  });

  const { categories } = useMenu(branch?.id);

  if (!branch) return <Navigate to="/" replace />;

  // Skip "Chef's Specials" for the homepage teaser strip — it's meant to
  // stand out on the full menu page, not steal the "taste of the menu" spot
  // from the everyday categories, and it may well be empty most weeks.
  const previewCategory = categories.find((c) => c.id !== "chefs-specials") ?? categories[0];
  const totalDishes = categories.reduce((sum, c) => sum + c.items.length, 0);
  const signatureCount = categories.reduce(
    (sum, c) => sum + c.items.filter((item) => item.badges && item.badges.length > 0).length,
    0,
  );

  return (
    <div>
      <Hero branch={branch} />

      <StatsBar
        stats={[
          { value: branch.rating, decimals: 1, label: "Average rating" },
          { value: branch.reviewCount, suffix: "+", label: "Guest reviews" },
          { value: totalDishes, suffix: "+", label: "Menu dishes" },
          { value: signatureCount, label: "Signature dishes" },
        ]}
      />

      {previewCategory && (
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <div className="flex flex-col items-center text-center">
            <span className="eyebrow">{previewCategory.label}</span>
            <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
              A taste of the menu
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {previewCategory.items.slice(0, 3).map((dish, i) => (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <MenuCard item={dish} onSelect={setSelected} />
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to={`/${branch.id}/menu`}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              View the full menu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {categories.length > 0 && <SignatureDishes categories={categories} />}

      {branch.gallery.length > 1 && <GallerySection branch={branch} />}

      <ReviewsSection branch={branch} />

      <div className="mx-auto max-w-4xl px-6 md:px-10">
        <div className="divider-gold" />
      </div>

      <FaqSection branch={branch} />
      <ContactSection branch={branch} />

      <MenuItemModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
