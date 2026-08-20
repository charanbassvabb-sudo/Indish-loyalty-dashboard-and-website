import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { useContentValue } from "@/context/SiteContentContext";

export function AnnouncementBanner() {
  const message = useContentValue("announcementBanner", undefined, "");
  const [dismissed, setDismissed] = useState(false);

  if (!message || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-[60] flex items-center justify-center gap-2 bg-gradient-ember px-6 py-2.5 text-center text-xs font-semibold text-primary-foreground md:text-sm"
      >
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        <span>{message}</span>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="absolute right-4 rounded-full p-1 hover:bg-black/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
