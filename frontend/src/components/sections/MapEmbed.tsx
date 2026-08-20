import { useState, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { Navigation } from "lucide-react";
import type { Branch } from "@/types";

/**
 * A Google Maps embed (no API key required) recoloured to sit inside the
 * near-black / royal-blue-and-gold theme instead of reading as a bright
 * rectangle dropped onto a dark page — see the `.map-frame` filter + tint
 * in index.css. Framed like the site's other premium cards: gold corner
 * brackets, the shared spotlight glow, and a veil caption bar reusing the
 * same treatment as the hero image.
 */
export function MapEmbed({ branch }: { branch: Branch }) {
  const [loaded, setLoaded] = useState(false);
  const query = encodeURIComponent(branch.plusCode);

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    e.currentTarget.style.setProperty("--spot-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMouseMove}
      className="map-frame spotlight-card card-warm relative mt-10 overflow-hidden transition-shadow hover:shadow-warm"
    >
      <span className="pointer-events-none absolute left-3 top-3 z-10 h-6 w-6 border-l-2 border-t-2 border-gold/70" />
      <span className="pointer-events-none absolute right-3 top-3 z-10 h-6 w-6 border-r-2 border-t-2 border-gold/70" />
      <span className="pointer-events-none absolute bottom-3 left-3 z-10 h-6 w-6 border-b-2 border-l-2 border-gold/70" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-10 h-6 w-6 border-b-2 border-r-2 border-gold/70" />

      {!loaded && <div className="skeleton absolute inset-0 rounded-2xl" aria-hidden />}

      <iframe
        title={`Map to ${branch.name}`}
        src={`https://www.google.com/maps?q=${query}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
        className={`h-[340px] w-full border-0 transition-opacity duration-700 md:h-[420px] ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="map-tint pointer-events-none absolute inset-0" aria-hidden />

      <div className="bg-veil absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">{branch.name}</p>
          <p className="text-xs text-cream/70">{branch.plusCode}</p>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${query}`}
          target="_blank"
          rel="noreferrer"
          className="btn-shine bg-gradient-ember shadow-warm inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          <Navigation className="h-3.5 w-3.5" />
          Directions
        </a>
      </div>
    </motion.div>
  );
}
