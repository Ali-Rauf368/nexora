import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { prisma, type Role } from "./db/prisma";
import { HttpError } from "./lib/http";

export const COOKIE = "nexora_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

export function issueSession(res: Response, userId: string) {
  const c = config();
  const token = jwt.sign({ sub: userId }, c.JWT_SECRET, { expiresIn: `${c.SESSION_HOURS}h` });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: c.NODE_ENV === "production",
    maxAge: c.SESSION_HOURS * 3600_000,
  });
}

/** Loads the user on every request so deactivated accounts lose access immediately. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next(new HttpError(401, "Not signed in"));
  try {
    const { sub } = jwt.verify(token, config().JWT_SECRET) as { sub: string };
    const user = await prisma().user.findUnique({ where: { id: sub }, select: { id: true, name: true, email: true, role: true, active: true } });
    if (!user?.active) return next(new HttpError(401, "Session expired"));
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    next(new HttpError(401, "Session expired"));
  }
}

export const allow =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role) ? next() : next(new HttpError(403, "You don't have access to this"));
