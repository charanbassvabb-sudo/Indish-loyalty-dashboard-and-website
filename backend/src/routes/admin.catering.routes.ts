import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  listCateringPackagesAdmin,
  createCateringPackage,
  updateCateringPackage,
  deleteCateringPackage,
  createCateringCategory,
  updateCateringCategory,
  deleteCateringCategory,
  createCateringItem,
  updateCateringItem,
  deleteCateringItem,
  listCateringEnquiries,
  updateCateringEnquiry,
} from "../controllers/catering.controller";

const router = Router();

// Every route below requires a valid admin session.
router.use(requireAdmin);

router.get("/packages", asyncHandler(listCateringPackagesAdmin));
router.post("/packages", asyncHandler(createCateringPackage));
router.patch("/packages/:id", asyncHandler(updateCateringPackage));
router.delete("/packages/:id", asyncHandler(deleteCateringPackage));

router.post("/categories", asyncHandler(createCateringCategory));
router.patch("/categories/:id", asyncHandler(updateCateringCategory));
router.delete("/categories/:id", asyncHandler(deleteCateringCategory));

router.post("/items", asyncHandler(createCateringItem));
router.patch("/items/:id", asyncHandler(updateCateringItem));
router.delete("/items/:id", asyncHandler(deleteCateringItem));

router.get("/enquiries", asyncHandler(listCateringEnquiries));
router.patch("/enquiries/:id", asyncHandler(updateCateringEnquiry));

export default router;
