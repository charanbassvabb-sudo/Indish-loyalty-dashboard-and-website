import { Router } from "express";
import { getCateringPackages, createCateringEnquiry } from "../controllers/catering.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { cateringLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/packages", asyncHandler(getCateringPackages));
router.post("/enquiries", cateringLimiter, asyncHandler(createCateringEnquiry));

export default router;
