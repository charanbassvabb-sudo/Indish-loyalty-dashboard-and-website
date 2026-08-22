import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { ApiError } from "../utils/ApiError";

// Same "outside src/" reasoning as PAYMENT_SCREENSHOT_DIR in payment upload
// middleware — survives a `tsc` build. Unlike payment screenshots, this one
// IS meant to be public: served statically at /api/uploads/menu-images/
// (mounted in app.ts, ahead of the general API rate limiter so a busy menu
// page loading a few dozen photos at once can't burn through it).
export const MENU_IMAGE_DIR = path.join(__dirname, "..", "..", "uploads", "menu-images");
fs.mkdirSync(MENU_IMAGE_DIR, { recursive: true });

const ALLOWED_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MENU_IMAGE_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_EXT[file.mimetype] ?? path.extname(file.originalname) ?? "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadMenuImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — a dish photo, not a screen recording
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_EXT[file.mimetype]) {
      cb(ApiError.badRequest("Only JPEG, PNG, or WEBP images are allowed") as unknown as Error);
      return;
    }
    cb(null, true);
  },
}).single("image");
