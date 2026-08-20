import { useEffect } from "react";

interface DocumentMetaOptions {
  title: string;
  description?: string;
  /** Absolute canonical URL for this page. */
  canonical?: string;
  /** JSON-LD structured data object(s) to inject as <script type="application/ld+json">. */
  jsonLd?: object | object[];
  /** Set to true on non-content pages (e.g. admin) to keep them out of search. */
  noindex?: boolean;
}

const SITE_URL = "https://www.indishzambia.com";
const DEFAULT_TITLE = "Indish — Fire-Forward Indian Restaurant | Lusaka & Kitwe, Zambia";
const DEFAULT_DESCRIPTION =
  "Indish serves tandoor-fired, fusion-forward Indian cuisine at two branches in Zambia: EastPark Mall, Lusaka and Kitwe. Reserve a table online.";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets document.title, the meta description, canonical link, Open Graph /
 * Twitter tags, and optional JSON-LD for the currently mounted page. This is
 * a plain client-side SPA (no SSR), so search engines that execute JS still
 * see per-route metadata; it also keeps social share previews accurate when
 * a URL is shared directly.
 */
export function useDocumentMeta({ title, description, canonical, jsonLd, noindex }: DocumentMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const desc = description ?? DEFAULT_DESCRIPTION;
    setMeta("description", desc);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);

    let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    const canonicalUrl = canonical ?? `${SITE_URL}${window.location.pathname}`;
    canonicalEl.href = canonicalUrl;
    setMeta("og:url", canonicalUrl, "property");

    let ldEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      ldEl = document.createElement("script");
      ldEl.type = "application/ld+json";
      ldEl.text = JSON.stringify(jsonLd);
      document.head.appendChild(ldEl);
    }

    return () => {
      document.title = prevTitle;
      setMeta("description", DEFAULT_DESCRIPTION);
      setMeta("robots", "index, follow");
      setMeta("og:title", DEFAULT_TITLE, "property");
      setMeta("og:description", DEFAULT_DESCRIPTION, "property");
      setMeta("twitter:title", DEFAULT_TITLE);
      setMeta("twitter:description", DEFAULT_DESCRIPTION);
      if (ldEl) ldEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, noindex, JSON.stringify(jsonLd)]);
}

/** Builds schema.org Restaurant JSON-LD for a branch, for use with useDocumentMeta. */
export function buildRestaurantJsonLd(branch: {
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  hours: string;
  id: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: branch.name,
    image: `${SITE_URL}/og-image.jpg`,
    url: `${SITE_URL}/${branch.id}`,
    telephone: branch.phone,
    priceRange: "ZMW 80 - ZMW 400",
    servesCuisine: ["Indian", "Fusion", "Tandoor"],
    address: {
      "@type": "PostalAddress",
      streetAddress: branch.address,
      addressCountry: "ZM",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: branch.rating,
      reviewCount: branch.reviewCount,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "11:30",
      closes: "22:00",
    },
    acceptsReservations: true,
  };
}
