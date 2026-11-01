import { Router } from "express";
import { z } from "zod";
import { allow } from "../auth";
import { prisma } from "../db/prisma";
import { logAccess } from "../lib/access-log";
import { HttpError, param } from "../lib/http";
import { hashPassword } from "../lib/password";

export const staffRouter = Router();

const select = { id: true, email: true, name: true, role: true, specialty: true, color: true, active: true } as const;

/** Everyone may list doctors (for booking); only admins see the full staff list. */
staffRouter.get("/", async (req, res) => {
  const onlyDoctors = req.user!.role !== "ADMIN" || req.query.role === "DOCTOR";
  const staff = await prisma().user.findMany({
    where: onlyDoctors ? { role: "DOCTOR", active: true } : {},
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select,
  });
  res.json(staff);
});

staffRouter.post("/", allow("ADMIN"), async (req, res) => {
  const input = z
    .object({
      email: z.string().email(),
      name: z.string().trim().min(2),
      role: z.enum(["ADMIN", "DOCTOR", "RECEPTION"]),
      specialty: z.string().trim().optional(),
      password: z.string().min(10, "Use at least 10 characters"),
    })
    .parse(req.body);
  const email = input.email.toLowerCase();
  if (await prisma().user.findUnique({ where: { email } })) throw new HttpError(409, "That email is already in use");
  const user = await prisma().user.create({
    data: {
      email,
      name: input.name,
      role: input.role,
      specialty: input.role === "DOCTOR" ? input.specialty || "General Practice" : null,
      color: input.role === "DOCTOR" ? "#6366f1" : null,
      passwordHash: await hashPassword(input.password),
    },
    select,
  });
  logAccess(req, "create", "user", user.id, `${user.name} (${user.role})`);
  res.status(201).json(user);
});

staffRouter.patch("/:id", allow("ADMIN"), async (req, res) => {
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  if (param(req, "id") === req.user!.id) throw new HttpError(400, "You can't deactivate yourself");
  const user = await prisma().user.update({ where: { id: param(req, "id") }, data: { active }, select });
  logAccess(req, active ? "activate" : "deactivate", "user", user.id, user.name);
  res.json(user);
});
