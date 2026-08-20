import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { ApiError } from "../utils/ApiError";

// Stored outside src/ (alongside dist/ at the backend root) so it survives a
// `tsc` build. Not served statically/publicly — see payment.routes.ts for
// the authenticated admin route that streams a screenshot back.
export const PAYMENT_SCREENSHOT_DIR = path.join(__dirname, "..", "..", "uploads", "payment-screenshots");
fs.mkdirSync(PAYMENT_SCREENSHOT_DIR, { recursive: true });

const ALLOWED_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PAYMENT_SCREENSHOT_DIR),
  filename: (_req, file, cb) => {
    // Random filename, not the customer's original one — avoids path
    // traversal tricks and avoids leaking anything from their filename.
    const ext = ALLOWED_MIME_EXT[file.mimetype] ?? path.extname(file.originalname) ?? "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadPaymentScreenshot = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB — generous for a phone screenshot
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_EXT[file.mimetype]) {
      // An ApiError here still reaches errorHandler.ts as `err` (multer just
      // forwards whatever's passed to `next()`), so this renders as a
      // proper 400 with a real message instead of a generic 500.
      cb(ApiError.badRequest("Only JPEG, PNG, or WEBP images are allowed") as unknown as Error);
      return;
    }
    cb(null, true);
  },
}).single("screenshot");
