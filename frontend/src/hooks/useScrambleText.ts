import { useEffect, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#________";

/**
 * Scrambles `text` in on mount: random glyphs settle into the real
 * characters left-to-right, like a terminal decrypting a string. Respects
 * prefers-reduced-motion by returning the final text immediately.
 */
export function useScrambleText(text: string, { speed = 32, delay = 0 } = {}) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    let timeoutId: number;
    const totalFrames = text.length * 3 + 10;

    function tick() {
      frame += 1;
      const revealCount = Math.floor((frame / totalFrames) * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        out += char === " " || i < revealCount ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (frame < totalFrames) {
        timeoutId = window.setTimeout(tick, speed);
      } else {
        setDisplay(text);
      }
    }

    const startId = window.setTimeout(tick, delay);
    return () => {
      window.clearTimeout(startId);
      window.clearTimeout(timeoutId);
    };
  }, [text, speed, delay]);

  return display;
}
