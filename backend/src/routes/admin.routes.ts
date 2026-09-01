import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  listReservations,
  getReservation,
  updateReservation,
  exportReservations,
} from "../controllers/reservation.controller";
import { getReportsSummary } from "../controllers/reports.controller";
import {
  listAvailability,
  upsertAvailability,
  deleteAvailability,
} from "../controllers/availability.controller";
import { listContent, upsertContent } from "../controllers/content.controller";
import { listDiscounts } from "../controllers/discount.controller";

const router = Router();

// Every route below requires a valid admin session.
router.use(requireAdmin);

router.get("/reservations", asyncHandler(listReservations));
router.get("/reservations/export", asyncHandler(exportReservations));
router.get("/reservations/:id", asyncHandler(getReservation));
router.patch("/reservations/:id", asyncHandler(updateReservation));

router.get("/reports/summary", asyncHandler(getReportsSummary));

router.get("/discounts", asyncHandler(listDiscounts));

router.get("/availability", asyncHandler(listAvailability));
router.put("/availability", asyncHandler(upsertAvailability));
router.delete("/availability/:id", asyncHandler(deleteAvailability));

router.get("/content", asyncHandler(listContent));
router.put("/content", asyncHandler(upsertContent));

export default router;
