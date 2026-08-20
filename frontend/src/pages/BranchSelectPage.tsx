import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { branchList } from "@/data/branches";
import type { BranchId } from "@/types";
import logo from "@/assets/images/logo.png";
import { blurPlaceholders } from "@/assets/blurPlaceholders";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function BranchSelectPage() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<BranchId | null>(null);

  useDocumentMeta({
    title: "Indish — Choose Your Branch | Lusaka & Kitwe, Zambia",
    description:
      "Choose between Indish EastPark Mall, Lusaka and Indish ECL Mall, Kitwe — tandoor-fired, fusion-forward Indian cuisine at both branches.",
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-16 text-center md:pt-20"
      >
        <motion.span variants={item} className="eyebrow">
          Zambia · Two Kitchens
        </motion.span>
        <motion.img
          variants={item}
          src={logo}
          alt="Indish"
          className="pointer-events-auto mt-4 h-16 w-auto md:h-20"
        />
        <motion.h1
          variants={item}
          className="mt-4 font-display text-4xl leading-[1.05] text-foreground md:text-6xl"
        >
          Choose your <span className="text-gradient-ember">branch</span>
        </motion.h1>
        <motion.p variants={item} className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
          Same fire, same spice cabinet, two very different rooms. Pick the branch closest to you.
        </motion.p>
      </motion.div>

      <div className="flex min-h-screen flex-col md:flex-row">
        {branchList.map((branch) => {
          const isHovered = hovered === branch.id;
          const isDimmed = hovered !== null && !isHovered;

          return (
            <motion.button
              key={branch.id}
              onClick={() => navigate(`/${branch.id}`)}
              onMouseEnter={() => setHovered(branch.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(branch.id)}
              onBlur={() => setHovered(null)}
              animate={{ flex: isHovered ? 1.3 : isDimmed ? 0.7 : 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex min-h-[50vh] flex-1 items-end justify-center overflow-hidden text-left md:min-h-screen"
              aria-label={`Enter ${branch.name}`}
            >
              {branch.heroImageBlurKey && blurPlaceholders[branch.heroImageBlurKey] && (
                <img
                  src={blurPlaceholders[branch.heroImageBlurKey]}
                  aria-hidden
                  alt=""
                  className="absolute inset-0 h-full w-full scale-105 object-cover blur-xl"
                />
              )}
              <motion.img
                src={branch.heroImage}
                alt={`${branch.name} restaurant`}
                animate={{ scale: isHovered ? 1.08 : 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className={`absolute inset-0 transition-colors duration-500 ${
                  isDimmed ? "bg-background/70" : "bg-background/35"
                }`}
              />
              <div className="bg-veil absolute inset-0" />

              <motion.div
                animate={{ opacity: isHovered ? 1 : 0.6 }}
                className="relative z-10 flex w-full flex-col gap-4 px-8 pb-16 pt-24 md:px-12 md:pb-20"
              >
                <span className="eyebrow">{branch.seating.includes("outdoor") ? "Indoor & Outdoor Seating" : "Indoor Dining"}</span>
                <h2 className="font-display text-4xl text-foreground md:text-5xl">{branch.name}</h2>
                <p className="max-w-sm text-sm text-cream/80 md:text-base">{branch.tagline}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-cream/70">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    {branch.address}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {branch.rating} ({branch.reviewCount} reviews)
                  </span>
                </div>

                <motion.span
                  animate={{ x: isHovered ? 6 : 0 }}
                  className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  Reserve a table
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
