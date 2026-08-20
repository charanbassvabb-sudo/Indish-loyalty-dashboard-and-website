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
        className={`relative h-full w-full object-cover transition-opacity duration-700 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        } ${imgClassName}`}
        {...imgProps}
      />
    </div>
  );
}
