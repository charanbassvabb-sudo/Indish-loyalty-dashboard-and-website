import { useEffect } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { StickyReserveBar } from "./StickyReserveBar";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { burstConfetti } from "@/lib/confetti";
import { useToast } from "@/context/ToastContext";

// Rendered as a parent layout route (see App.tsx) rather than wrapping
// <Routes> from outside — that's what lets useParams() work inside Navbar.
// A component outside the matched <Route> tree (e.g. passed in as a plain
// `children` prop wrapping <Routes>) never sees that route's params; nested
// layout routes share the same matched branch, so useParams() here (and in
// anything Layout renders, like Navbar) correctly sees :branchId.
export function Layout() {
  const location = useLocation();
  const { toast } = useToast();

  // `useOutlet()` instead of `<Outlet />`: the latter is a live subscription
  // that re-renders to the *new* route immediately, even while the old,
  // exiting `motion.main` below (kept mounted by AnimatePresence's
  // `mode="wait"` while it plays its exit animation) is still on screen —
  // so the exit animation ends up playing on the new page's content and
  // gets stuck at its faded-out end state once the transition "completes",
  // since no entrance animation was ever actually triggered for it. Capturing
  // the outlet element via the hook freezes a snapshot for this render
  // instead, so the exit animation genuinely applies to the outgoing page.
  const element = useOutlet();

  // Easter egg: the Konami code bursts a shower of naan bread anywhere on
  // the site — a small reward for guests who go looking.
  useKonamiCode(() => {
    burstConfetti({ emoji: ["🫓", "🔥", "✨"], count: 90 });
    toast({ title: "Secret menu unlocked!", description: "You found the naan-fetti. Extra spice on us.", variant: "success" });
  });

  // React Router doesn't reset scroll position on client-side navigation,
  // and — unlike a full page load — it never scrolls to an in-page anchor
  // either. Without the first part, navigating from a scrolled-down page
  // (e.g. deep into one branch's home page) to another route mounts the new
  // page while the viewport is still scrolled far down, which breaks
  // scroll-linked animations in Hero.tsx (useScroll computes against the
  // stale scroll position, so its content can initialize fully transparent)
  // and any `whileInView` reveal further down the page. Without the second
  // part, the navbar's "Reviews"/"Contact" links (which point at
  // `#reviews`/`#contact`) just silently change the URL and do nothing.
  //
  // The target section may not exist yet the instant this runs — if the
  // link was clicked from a different route (e.g. the menu page), the home
  // page it lives on hasn't mounted, and AnimatePresence's `mode="wait"`
  // delays that mount until the outgoing page's exit animation finishes —
  // so this polls briefly instead of assuming the element is already there.
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      return;
    }

    const id = location.hash.slice(1);
    let cancelled = false;
    let attempts = 0;

    function tryScroll() {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryScroll, 50);
      }
    }
    tryScroll();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="ambient-grain no-print" aria-hidden />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="no-print contents">
        <Navbar />
      </div>
      <AnimatePresence mode="wait">
        <motion.main
          id="main-content"
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          {element}
        </motion.main>
      </AnimatePresence>
      <div className="no-print contents">
        <Footer />
      </div>
      <StickyReserveBar />
    </div>
  );
}
