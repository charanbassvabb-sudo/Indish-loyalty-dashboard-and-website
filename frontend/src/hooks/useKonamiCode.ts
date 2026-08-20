import { useEffect, useRef } from "react";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/** Fires `onUnlock` when the Konami code is typed anywhere on the page. */
export function useKonamiCode(onUnlock: () => void) {
  const progress = useRef(0);
  const callback = useRef(onUnlock);
  callback.current = onUnlock;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const expected = SEQUENCE[progress.current];
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        progress.current += 1;
        if (progress.current === SEQUENCE.length) {
          progress.current = 0;
          callback.current();
        }
      } else {
        progress.current = key === SEQUENCE[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
