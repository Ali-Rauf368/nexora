import { Router } from "express";
import { z } from "zod";
import { allow } from "../auth";
import { prisma, type Prisma } from "../db/prisma";
import { logAccess } from "../lib/access-log";
import { notFound, param } from "../lib/http";

export const patientsRouter = Router();

const patientInput = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dateOfBirth: z.coerce.date(),
  sex: z.enum(["FEMALE", "MALE", "OTHER"]),
  phone: z.string().trim().min(5),
  email: z.string().email().nullish().or(z.literal("")),
  address: z.string().trim().nullish(),
  bloodType: z.string().trim().nullish(),
  allergies: z.string().trim().nullish(),
  insuranceProvider: z.string().trim().nullish(),
  insuranceNumber: z.string().trim().nullish(),
});

const clean = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === "" ? null : v])) as T;

patientsRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const where: Prisma.PatientWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { mrn: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {};
  const patients = await prisma().patient.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
    include: { appointments: { orderBy: { startsAt: "desc" }, take: 1, select: { startsAt: true } } },
  });
  res.json(
    patients.map(({ appointments, ...p }) => ({ ...p, lastVisit: appointments[0]?.startsAt ?? null })),
  );
});

patientsRouter.post("/", allow("ADMIN", "RECEPTION"), async (req, res) => {
  const data = clean(patientInput.parse(req.body));
  const patient = await prisma().$transaction(async (tx) => {
    const count = await tx.patient.count();
    return tx.patient.create({ data: { ...data, email: data.email || null, mrn: `MRN-${String(count + 1001).padStart(6, "0")}` } });
  });
  logAccess(req, "create", "patient", patient.id, `${patient.firstName} ${patient.lastName}`);
  res.status(201).json(patient);
});

patientsRouter.get("/:id", async (req, res) => {
  const clinical = req.user!.role !== "RECEPTION";
  const patient = await prisma().patient.findUnique({
    where: { id: param(req, "id") },
    include: {
      appointments: {
        orderBy: { startsAt: "desc" },
        include: {
          doctor: { select: { id: true, name: true } },
          consultation: clinical ? { include: { prescriptions: true } } : false,
        },
      },
      invoices: { orderBy: { createdAt: "desc" }, include: { lines: true } },
    },
  });
  if (!patient) throw notFound("Patient");
  logAccess(req, "view", "patient", patient.id, `${patient.firstName} ${patient.lastName}`);
  res.json(patient);
});

patientsRouter.patch("/:id", allow("ADMIN", "RECEPTION"), async (req, res) => {
  const data = clean(patientInput.partial().parse(req.body));
  const patient = await prisma().patient.update({ where: { id: param(req, "id") }, data: { ...data, email: data.email || null } });
  logAccess(req, "update", "patient", patient.id, Object.keys(data).join(", "));
  res.json(patient);
});
