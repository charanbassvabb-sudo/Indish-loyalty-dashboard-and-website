import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import { branchList } from "@/data/branches";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Button } from "@/components/ui/button";

// Google Maps "write a review" links for each branch's listing (the `1b1`
// deep-link flag on these opens straight to the reviews panel). Grabbed
// directly from each branch's own Maps listing — update here if a listing
// ever gets re-created under a new place ID.
const GOOGLE_REVIEW_LINKS: Record<string, string> = {
  lusaka:
    "https://www.google.com/maps/place/Indish+Fusion+Food+%26+Cocktails+%7C+EastPark+Mall/@-15.3942733,28.3208728,17z/data=!4m8!3m7!1s0x19408be187bd7a75:0x3addebfdb94b2541!8m2!3d-15.3942733!4d28.3234477!9m1!1b1!16s%2Fg%2F11spxv63sx?entry=ttu",
  kitwe:
    "https://www.google.com/maps/place/INDISH+FUSION+FOODS+%26+COCKTAILS/@-12.8082315,28.2089667,17z/data=!4m8!3m7!1s0x196ce736cbac3619:0x2f3bb0baebe30258!8m2!3d-12.8082315!4d28.2115416!9m1!1b1!16s%2Fg%2F11fnvs733s?entry=ttu",
};

// Standalone "which branch did you visit?" page — this is what the
// front-of-house "Leave us a review" QR code points at, so one printed code
// works no matter which branch a guest is scanning it in. Not branch-scoped
// (no :branchId in its route) on purpose, same as BranchSelectPage.
export default function LeaveReviewPage() {
  useDocumentMeta({
    title: "Leave a Review | Indish",
    description: "Enjoyed your visit? Tell us about it on Google — pick your branch below.",
    canonical: "https://www.indishzambia.com/leave-a-review",
    noindex: true,
  });

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-24 text-center">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="eyebrow"
      >
        Thank you for dining with us
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 max-w-xl font-display text-4xl text-foreground md:text-5xl"
      >
        Leave us a <span className="text-gradient-ember">review</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-4 max-w-md text-sm text-muted-foreground md:text-base"
      >
        Which branch did you visit? We'll take you straight to Google.
      </motion.p>

      <div className="mt-10 grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        {branchList.map((branch, i) => (
          <motion.a
            key={branch.id}
            href={GOOGLE_REVIEW_LINKS[branch.id]}
            target="_blank"
            rel="noreferrer noopener"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="card-warm group flex flex-col items-center gap-3 p-8 transition-transform hover:scale-[1.02]"
          >
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {branch.name}
            </span>
            <span className="flex items-center gap-1 text-primary">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </span>
            <Button asChild variant="default" size="lg" className="mt-2 pointer-events-none">
              <span>Review {branch.name.replace("Indish — ", "")}</span>
            </Button>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
