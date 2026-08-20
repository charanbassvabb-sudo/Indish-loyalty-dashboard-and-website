import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export interface AdminTokenPayload {
  adminId: number;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/** Requires a valid admin JWT, read from the httpOnly auth cookie. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.ADMIN_COOKIE_NAME];

  if (!token) {
    throw ApiError.unauthorized("Admin login required");
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminTokenPayload;
    req.admin = payload;
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired session");
  }
}

/** Restricts a route to specific admin roles. Use after requireAdmin. */
export function requireRole(...roles: AdminTokenPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      throw ApiError.forbidden("You don't have permission to do this");
    }
    next();
  };
}
