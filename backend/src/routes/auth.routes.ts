import { Router } from "express";
import { login, logout, me } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { loginLimiter } from "../middleware/rateLimiter";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.post("/login", loginLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAdmin, asyncHandler(me));

export default router;
