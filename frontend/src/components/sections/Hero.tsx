import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight } from "lucide-react";
import type { Branch } from "@/types";
import { useContentValue } from "@/context/SiteContentContext";
import { blurPlaceholders } from "@/assets/blurPlaceholders";
import { useScrambleText } from "@/hooks/useScrambleText";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero({ branch }: { branch: Branch }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const placeholder = branch.heroImageBlurKey ? blurPlaceholders[branch.heroImageBlurKey] : undefined;

  const heading = useContentValue("heroHeading", branch.id, "Fire-forward Indian, reimagined");
  const subheading = useContentValue("heroSubheading", branch.id, "");

  // Split once so each half can scramble-reveal independently — the accent
  // half starts a beat after the first so the effect reads left-to-right.
  const [headingLead, headingAccent] = heading.includes(",")
    ? [heading.split(",")[0], heading.split(",").slice(1).join(",").trim()]
    : [heading, ""];
  const scrambledLead = useScrambleText(headingLead, { speed: 20 });
  const scrambledAccent = useScrambleText(headingAccent, { speed: 20, delay: headingLead.length * 20 + 80 });

  return (
    <section ref={ref} className="relative flex min-h-[92vh] items-end overflow-hidden">
      {placeholder && (
        <img
          src={placeholder}
          aria-hidden
          alt=""
          className={`absolute inset-0 h-full w-full scale-105 object-cover blur-xl transition-opacity duration-700 ease-out ${
            imgLoaded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
      <motion.img
        src={branch.heroImage}
        alt={`Signature dishes at ${branch.name}`}
        style={{ y: imgY }}
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        onLoad={() => setImgLoaded(true)}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="bg-veil absolute inset-0" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-40 md:px-10 md:pb-28"
      >
        <motion.span variants={item} className="eyebrow">
          {branch.id === "lusaka" ? "EastPark Mall · Lusaka" : "Copperbelt · Kitwe"}
        </motion.span>
        <motion.h1
          variants={item}
          className="mt-4 max-w-2xl font-display text-5xl leading-[1.03] text-foreground md:text-7xl"
        >
          {headingAccent ? (
            <>
              {scrambledLead},{" "}
              <span className="text-gradient-ember">{scrambledAccent}</span>
            </>
          ) : (
            scrambledLead
          )}
        </motion.h1>
        <motion.p variants={item} className="mt-5 max-w-lg text-base text-cream/80 md:text-lg">
          {subheading ||
            `${branch.tagline}. ${
              branch.seating.includes("outdoor")
                ? "Dine indoors or under the stars on our patio."
                : "An intimate indoor dining room built for long, spiced dinners."
            }`}
        </motion.p>

        <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-cream/80">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            {branch.address}
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-primary text-primary" />
            {branch.rating} ({branch.reviewCount} reviews)
          </span>
        </motion.div>

        <motion.div variants={item} className="mt-9 flex flex-wrap gap-4">
          <Link
            to={`/${branch.id}/reserve`}
            className="btn-shine bg-gradient-ember shadow-warm flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Reserve a Table
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={`/${branch.id}/menu`}
            className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
          >
            View Menu
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-cream/50">Scroll</span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-px bg-gradient-to-b from-primary to-transparent"
        />
      </motion.div>
    </section>
  );
}
