import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, Clock } from "lucide-react";
import { branches, branchList } from "@/data/branches";
import type { BranchId } from "@/types";
import logo from "@/assets/images/logo.png";

export function Footer() {
  const { branchId } = useParams<{ branchId: BranchId }>();
  const branch = branchId ? branches[branchId] : undefined;

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <img src={logo} alt="Indish" className="h-10 w-auto" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tandoor-fired, fusion-forward Indian cooking, poured in Zambia. Two kitchens, one
              spice cabinet.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-4">Our Branches</p>
            <ul className="space-y-4">
              {branchList.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/${b.id}`}
                    className="block text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span className="font-medium text-foreground">{b.name}</span>
                    <span className="mt-1 flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {b.address}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">{branch ? branch.name : "Get in Touch"}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" />
                {branch ? branch.phone : "0976309999 · 0963240240"}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {branch ? branch.hours : "11:30 – 22:00 daily"}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground md:flex-row">
          <p>&copy; {new Date().getFullYear()} Indish. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to={branch ? `/${branch.id}/complaints` : "/"} className="hover:text-primary">
              Complaints
            </Link>
            <Link to="/privacy-policy" className="hover:text-primary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
