import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import reservationRoutes from "./routes/reservation.routes";
import adminRoutes from "./routes/admin.routes";
import paymentRoutes from "./routes/payment.routes";
import menuRoutes from "./routes/menu.routes";
import authRoutes from "./routes/auth.routes";
import publicRoutes from "./routes/public.routes";
import whatsappRoutes from "./routes/whatsapp.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // required for correct client IPs behind the Nginx reverse proxy

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: "1mb",
      // Stashes the exact raw bytes Meta signed, so the WhatsApp webhook can
      // verify X-Hub-Signature-256 — JSON.stringify(req.body) wouldn't
      // reliably byte-match what Meta actually hashed (key order, spacing).
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use("/api", apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api/whatsapp", whatsappRoutes);
  app.use("/api/reservations", reservationRoutes);
  app.use("/api/admin/auth", authRoutes);
  app.use("/api/admin/payment-attempts", paymentRoutes);
  app.use("/api/admin/menu", menuRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
