import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Screenshot is too large — please keep it under 8MB." : err.message;
    res.status(400).json({ error: message });
    return;
  }

  console.error("[unhandled error]", err);
  res.status(500).json({
    error: "Something went wrong. Please try again.",
    ...(env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
  });
}
