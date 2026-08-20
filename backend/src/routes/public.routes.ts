import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getPublicAvailability } from "../controllers/availability.controller";
import { getPublicContent } from "../controllers/content.controller";
import { getPublicMenu } from "../controllers/menu.controller";

const router = Router();

// Read-only, unauthenticated endpoints consumed by the public site.
router.get("/availability", asyncHandler(getPublicAvailability));
router.get("/content", asyncHandler(getPublicContent));
router.get("/menu", asyncHandler(getPublicMenu));

export default router;
