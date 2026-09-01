import rateLimit from "express-rate-limit";

/** General API limiter — generous, just to blunt abusive scripts. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tighter limiter for admin login — slows down credential-stuffing attempts. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});

/** Limiter for reservation creation — prevents spamming fake bookings. */
export const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reservation attempts. Please try again later." },
});

/**
 * Limiter for takeaway order creation + payment screenshot upload — same
 * shape as reservationLimiter, kept as a separate budget so a burst of
 * takeaway activity can't starve reservation attempts (or vice versa).
 */
export const takeawayLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many order attempts. Please try again later." },
});

/** Limiter for catering enquiries — a much lower-frequency action than orders. */
export const cateringLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many enquiries. Please try again later." },
});
