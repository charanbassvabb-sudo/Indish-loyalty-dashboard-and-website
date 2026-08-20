import { Router } from "express";
import { createReservation, getReservationByReference } from "../controllers/reservation.controller";
import { uploadPaymentScreenshot as uploadPaymentScreenshotHandler } from "../controllers/payment.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { reservationLimiter } from "../middleware/rateLimiter";
import { uploadPaymentScreenshot } from "../middleware/upload";

const router = Router();

router.post("/", reservationLimiter, asyncHandler(createReservation));
router.get("/:reference", asyncHandler(getReservationByReference));
// Same rate limiter as booking creation — this is the other half of the
// same abuse surface (spamming fake payment attempts against real or made-up
// reference codes).
router.post(
  "/:reference/payment-screenshot",
  reservationLimiter,
  uploadPaymentScreenshot,
  asyncHandler(uploadPaymentScreenshotHandler),
);

export default router;
