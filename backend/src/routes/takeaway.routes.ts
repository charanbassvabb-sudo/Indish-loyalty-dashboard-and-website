import { Router } from "express";
import { createTakeawayOrder, getTakeawayOrderByReference } from "../controllers/takeaway.controller";
import { uploadTakeawayPaymentScreenshot as uploadTakeawayPaymentScreenshotHandler } from "../controllers/payment.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { takeawayLimiter } from "../middleware/rateLimiter";
import { uploadPaymentScreenshot } from "../middleware/upload";

const router = Router();

router.post("/", takeawayLimiter, asyncHandler(createTakeawayOrder));
router.get("/:reference", asyncHandler(getTakeawayOrderByReference));
// Same rate limiter as order creation — same abuse surface as reservation
// payment uploads (spamming fake attempts against real or made-up references).
router.post(
  "/:reference/payment-screenshot",
  takeawayLimiter,
  uploadPaymentScreenshot,
  asyncHandler(uploadTakeawayPaymentScreenshotHandler),
);

export default router;
