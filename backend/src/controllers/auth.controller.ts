import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { adminLoginSchema, changePasswordSchema } from "../validators/auth.validator";
import type { AdminTokenPayload } from "../middleware/auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 12 * 60 * 60 * 1000, // 12h, keep roughly aligned with JWT_EXPIRES_IN
  path: "/",
};

export async function login(req: Request, res: Response) {
  const { email, password } = adminLoginSchema.parse(req.body);

  const admin = await prisma.admin.findUnique({ where: { email } });

  // Compare against a dummy hash when the admin doesn't exist, so response
  // timing doesn't reveal whether the email is registered.
  const passwordHash = admin?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin.";
  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (!admin || !passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const payload: AdminTokenPayload = { adminId: admin.id, email: admin.email, role: admin.role };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });

  res.cookie(env.ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(env.ADMIN_COOKIE_NAME, { path: "/" });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.admin) throw ApiError.unauthorized();
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.adminId } });
  if (!admin) throw ApiError.unauthorized();
  res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
}

/** Self-service password change — requires the current password, not just an active session. */
export async function changePassword(req: Request, res: Response) {
  if (!req.admin) throw ApiError.unauthorized();
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const admin = await prisma.admin.findUnique({ where: { id: req.admin.adminId } });
  if (!admin) throw ApiError.unauthorized();

  const currentMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!currentMatches) throw ApiError.unauthorized("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

  res.status(204).send();
}
