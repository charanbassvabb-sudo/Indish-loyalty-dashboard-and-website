import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone } from "lucide-react";
import { branches } from "@/data/branches";
import type { BranchId } from "@/types";
import { AnnouncementBanner } from "./AnnouncementBanner";
import logo from "@/assets/images/logo.png";

const links = [
  { to: "", label: "Home" },
  { to: "/menu", label: "Menu" },
  { to: "/#reviews", label: "Reviews" },
  { to: "/#contact", label: "Contact" },
];

export function Navbar() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/90 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <AnnouncementBanner />
      <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Indish" className="h-9 w-auto md:h-10" />
          {branch && (
            <span className="align-middle text-[0.65rem] font-sans font-bold uppercase tracking-[0.28em] text-primary">
              {branch.id}
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-8 md:flex" onMouseLeave={() => setHoveredLink(null)}>
          {branch &&
            links.map((link) => (
              <Link
                key={link.label}
                to={`/${branch.id}${link.to}`}
                onMouseEnter={() => setHoveredLink(link.label)}
                className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
                <AnimatePresence>
                  {hoveredLink === link.label && (
                    <motion.span
                      layoutId="navbar-underline"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-gradient-ember"
                    />
                  )}
                </AnimatePresence>
              </Link>
            ))}
          {branch && (
            <a
              href={`tel:${branch.phone}`}
              className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {branch.phone}
            </a>
          )}
          <Link
            to={branch ? `/${branch.id}/reserve` : "/"}
            className="btn-shine bg-gradient-ember rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground shadow-warm transition-transform hover:scale-105"
          >
            Reserve a Table
          </Link>
        </div>

        <button
          className="text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      <AnimatePresence>
        {open && branch && (
          <motion.div
            key="mobile-nav-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && branch && (
          <motion.div
            key="mobile-nav-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-50 border-t border-border bg-background shadow-lift md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {links.map((link) => (
                <Link
                  key={link.label}
                  to={`/${branch.id}${link.to}`}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to={`/${branch.id}/reserve`}
                onClick={() => setOpen(false)}
                className="btn-shine bg-gradient-ember mt-2 rounded-full px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
              >
                Reserve a Table
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
