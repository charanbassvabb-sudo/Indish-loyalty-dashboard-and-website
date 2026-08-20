import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Branch } from "@/types";
import { BlurImage } from "@/components/ui/BlurImage";

export function GallerySection({ branch }: { branch: Branch }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const photos = branch.gallery;
  const blurKeys = branch.galleryBlurKeys;

  function next() {
    setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }
  function prev() {
    setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
      <div className="mb-10 text-center">
        <span className="eyebrow">Inside {branch.name}</span>
        <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
          The <span className="text-gradient-ember">room</span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
          A look at the dining room, bar and lounge — captured on-site.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {photos.map((src, i) => (
          <motion.button
            key={src}
            type="button"
            onClick={() => setOpenIndex(i)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.03 }}
            className={`group relative overflow-hidden rounded-2xl ${
              i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square"
            }`}
          >
            <BlurImage
              src={src}
              alt={`${branch.name} interior ${i + 1}`}
              placeholderKey={blurKeys?.[i]}
              className="h-full w-full"
              imgClassName="transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenIndex(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          >
            <button
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
              className="absolute right-6 top-6 rounded-full border border-white/20 p-2 text-white transition-colors hover:border-primary hover:text-primary"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous photo"
              className="absolute left-4 rounded-full border border-white/20 p-2 text-white transition-colors hover:border-primary hover:text-primary md:left-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <motion.img
              key={photos[openIndex]}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              src={photos[openIndex]}
              alt="Enlarged interior"
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-lift"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next photo"
              className="absolute right-4 rounded-full border border-white/20 p-2 text-white transition-colors hover:border-primary hover:text-primary md:right-8"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
