import { useMotionValue, useSpring } from "framer-motion";
import { useRef, type MouseEvent } from "react";

/**
 * Attaches a 3D tilt (via framer-motion springs on rotateX/rotateY) and a
 * cursor-follow spotlight glow (via plain CSS custom properties, see the
 * `.spotlight-card` utility in index.css) to whatever element the returned
 * `ref` is placed on. Both effects are driven off a single mousemove handler
 * so hovering a card only costs one rect read per frame.
 *
 * Usage: spread `tiltProps` onto a `motion.*` element, add the
 * `spotlight-card` class, and pass `tiltProps.style` through (merging with
 * any other style you need).
 */
export function useTiltSpotlight<T extends HTMLElement = HTMLElement>(
  { max = 8 }: { max?: number } = {},
) {
  const ref = useRef<T>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 22, mass: 0.6 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 22, mass: 0.6 });

  function onMouseMove(e: MouseEvent<T>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    rotateY.set((px - 0.5) * max * 2);
    rotateX.set((0.5 - py) * max * 2);
    el.style.setProperty("--spot-x", `${px * 100}%`);
    el.style.setProperty("--spot-y", `${py * 100}%`);
  }

  function onMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return {
    ref,
    onMouseMove,
    onMouseLeave,
    style: { rotateX: springX, rotateY: springY, transformPerspective: 800 },
  };
}
