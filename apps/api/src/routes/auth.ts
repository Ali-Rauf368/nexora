import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { COOKIE, issueSession, requireAuth } from "../auth";
import { prisma } from "../db/prisma";
import { logAccess } from "../lib/access-log";
import { HttpError } from "../lib/http";
import { verifyPassword } from "../lib/password";

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma().user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect");
  }
  issueSession(res, user.id);
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  logAccess(req, "login", "user", user.id);
  res.json({ user: req.user });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
