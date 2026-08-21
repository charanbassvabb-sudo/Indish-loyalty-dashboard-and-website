import { Router } from "express";
import { login, logout, me, changePassword } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { loginLimiter } from "../middleware/rateLimiter";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.post("/login", loginLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAdmin, asyncHandler(me));
// Reuses the login rate limiter — this endpoint also checks a password
// (the current one), so it deserves the same brute-force protection.
router.patch("/me/password", requireAdmin, loginLimiter, asyncHandler(changePassword));

export default router;
