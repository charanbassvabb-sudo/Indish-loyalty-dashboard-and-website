import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  listPaymentAttempts,
  getPaymentAttempt,
  getPaymentAttemptScreenshot,
  actOnPaymentAttempt,
} from "../controllers/payment.controller";

const router = Router();

// Every route below requires a valid admin session — screenshots and
// extracted payment details are only ever surfaced to staff, never public.
router.use(requireAdmin);

router.get("/", asyncHandler(listPaymentAttempts));
router.get("/:id", asyncHandler(getPaymentAttempt));
router.get("/:id/screenshot", asyncHandler(getPaymentAttemptScreenshot));
router.patch("/:id", asyncHandler(actOnPaymentAttempt));

export default router;
