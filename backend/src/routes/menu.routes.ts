import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadMenuImage } from "../middleware/menuImageUpload";
import {
  listMenuAdmin,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuItemImage,
  removeMenuItemImage,
} from "../controllers/menu.controller";

const router = Router();

// Every route below requires a valid admin session — the public menu is
// served separately (GET /api/menu, see public.routes.ts).
router.use(requireAdmin);

router.get("/", asyncHandler(listMenuAdmin));
router.post("/items", asyncHandler(createMenuItem));
router.patch("/items/:id", asyncHandler(updateMenuItem));
router.delete("/items/:id", asyncHandler(deleteMenuItem));
router.post("/items/:id/image", uploadMenuImage, asyncHandler(uploadMenuItemImage));
router.delete("/items/:id/image", asyncHandler(removeMenuItemImage));

export default router;
