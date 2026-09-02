import { useState, type ImgHTMLAttributes } from "react";
import { blurPlaceholders } from "@/assets/blurPlaceholders";

interface BlurImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  alt: string;
  /**
   * Filename the placeholder was generated from (matches a key in
   * blurPlaceholders.ts, e.g. "kitwe-hall.jpg"). If omitted, falls back to
   * a plain skeleton shimmer instead of a blurred placeholder.
   */
  placeholderKey?: string;
  className?: string;
  imgClassName?: string;
  /**
   * Adds friction against casually saving this photo — client-requested for
   * menu dish photos. Important: this is NOT a screenshot block. Nothing on
   * the web can prevent a screenshot or screen recording — capture happens
   * at the OS/GPU level, entirely outside a page's visibility or control, on
   * every platform. What this actually does: disables right-click/drag/the
   * iOS long-press "Save to Photos" callout, and tiles a faint watermark
   * over the image so a screenshot that does happen still carries the
   * branding. Left off by default (e.g. branch interior photos) since it's
   * friction for legitimate visitors with no real protection to show for it
   * — only opt in where that trade-off was actually asked for.
   */
  protectContent?: boolean;
  watermarkText?: string;
}

function watermarkPattern(text: string): string {
  // Sparse and faint on purpose — this is meant to survive in a screenshot,
  // not to sit on top of a food photo the whole point of which is to look
  // appetizing. One repeat per ~280px keeps it present without fighting the
  // dish for attention.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='280' height='280'>
    <text x='0' y='150' font-size='12' fill='white' fill-opacity='0.11' transform='rotate(-30 140 140)' font-family='sans-serif' font-weight='600' letter-spacing='1'>${text}</text>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Blur-up image: renders a tiny blurred placeholder (see
 * src/assets/blurPlaceholders.ts) that crossfades into the sharp image once
 * it finishes loading, instead of a blank flash.
 */
export function BlurImage({
  src,
  alt,
  placeholderKey,
  className = "",
  imgClassName = "",
  protectContent = false,
  watermarkText = "INDISH · indishzambia.com",
  ...imgProps
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const placeholder = placeholderKey ? blurPlaceholders[placeholderKey] : undefined;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {placeholder ? (
        <img
          src={placeholder}
          aria-hidden
          alt=""
          className={`absolute inset-0 h-full w-full scale-105 object-cover blur-xl transition-opacity duration-700 ease-out ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : (
        <div className={`skeleton absolute inset-0 transition-opacity duration-700 ${loaded ? "opacity-0" : "opacity-100"}`} />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        draggable={!protectContent}
        onContextMenu={protectContent ? (e) => e.preventDefault() : undefined}
        onDragStart={protectContent ? (e) => e.preventDefault() : undefined}
        style={protectContent ? { WebkitTouchCallout: "none" } : undefined}
        className={`relative h-full w-full object-cover transition-opacity duration-700 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        } ${protectContent ? "select-none" : ""} ${imgClassName}`}
        {...imgProps}
      />
      {protectContent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: watermarkPattern(watermarkText), backgroundRepeat: "repeat" }}
        />
      )}
    </div>
  );
}
