import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  listTakeawayOrders,
  getTakeawayOrder,
  updateTakeawayOrder,
  exportTakeawayOrders,
} from "../controllers/takeaway.controller";
import { applyDiscount, updateDiscount, removeDiscount } from "../controllers/discount.controller";

const router = Router();

// Every route below requires a valid admin session.
router.use(requireAdmin);

router.get("/", asyncHandler(listTakeawayOrders));
router.get("/export", asyncHandler(exportTakeawayOrders));
router.get("/:id", asyncHandler(getTakeawayOrder));
router.patch("/:id", asyncHandler(updateTakeawayOrder));

router.post("/:id/discount", asyncHandler(applyDiscount));
router.patch("/:id/discount", asyncHandler(updateDiscount));
router.delete("/:id/discount", asyncHandler(removeDiscount));

export default router;
