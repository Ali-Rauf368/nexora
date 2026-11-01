import { Router } from "express";
import { z } from "zod";
import { allow } from "../auth";
import { prisma, type AppointmentStatus } from "../db/prisma";
import { logAccess } from "../lib/access-log";
import { HttpError, notFound, param } from "../lib/http";

export const appointmentsRouter = Router();

const include = {
  patient: { select: { id: true, mrn: true, firstName: true, lastName: true, allergies: true } },
  doctor: { select: { id: true, name: true, color: true } },
  consultation: { select: { id: true } },
} as const;

/** Day boundaries in server local time; the clinic runs in one time zone. */
function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime())) throw new HttpError(400, "date must be YYYY-MM-DD");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

appointmentsRouter.get("/", async (req, res) => {
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));
  const doctorId = req.query.doctorId ? String(req.query.doctorId) : undefined;
  const appointments = await prisma().appointment.findMany({
    where: { startsAt: dayRange(date), doctorId },
    orderBy: { startsAt: "asc" },
    include,
  });
  res.json(appointments);
});

const bookInput = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  startsAt: z.coerce.date(),
  durationMin: z.coerce.number().int().min(5).max(240).default(20),
  reason: z.string().trim().min(1),
});

appointmentsRouter.post("/", allow("ADMIN", "RECEPTION"), async (req, res) => {
  const input = bookInput.parse(req.body);
  const end = new Date(input.startsAt.getTime() + input.durationMin * 60_000);
  const doctor = await prisma().user.findFirst({ where: { id: input.doctorId, role: "DOCTOR", active: true } });
  if (!doctor) throw new HttpError(400, "Choose an active doctor");

  // Reject double-booking: any active appointment of this doctor overlapping [start, end).
  const sameDay = await prisma().appointment.findMany({
    where: {
      doctorId: input.doctorId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: end, gte: new Date(input.startsAt.getTime() - 240 * 60_000) },
    },
  });
  const clash = sameDay.find((a) => a.startsAt.getTime() + a.durationMin * 60_000 > input.startsAt.getTime());
  if (clash) {
    throw new HttpError(409, `${doctor.name} already has an appointment at ${clash.startsAt.toTimeString().slice(0, 5)}`);
  }

  const appointment = await prisma().appointment.create({ data: input, include });
  logAccess(req, "book", "appointment", appointment.id, `${appointment.patient.lastName} with ${doctor.name}`);
  res.status(201).json(appointment);
});

/** Which status changes are allowed from each status. */
const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: [],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

appointmentsRouter.patch("/:id/status", async (req, res) => {
  const { status } = z.object({ status: z.enum(["CHECKED_IN", "IN_PROGRESS", "CANCELLED", "NO_SHOW"]) }).parse(req.body);
  const role = req.user!.role;
  if (status === "IN_PROGRESS" && role === "RECEPTION") throw new HttpError(403, "Only doctors can start a consultation");
  if (status !== "IN_PROGRESS" && role === "DOCTOR") throw new HttpError(403, "Reception handles check-in and cancellations");

  const current = await prisma().appointment.findUnique({ where: { id: param(req, "id") } });
  if (!current) throw notFound("Appointment");
  if (!transitions[current.status].includes(status)) {
    throw new HttpError(409, `Cannot change an appointment from ${current.status} to ${status}`);
  }
  const appointment = await prisma().appointment.update({ where: { id: current.id }, data: { status }, include });
  logAccess(req, `status:${status}`, "appointment", appointment.id);
  res.json(appointment);
});

const consultationInput = z.object({
  diagnosis: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  bpSystolic: z.coerce.number().int().min(50).max(260).optional(),
  bpDiastolic: z.coerce.number().int().min(30).max(160).optional(),
  pulse: z.coerce.number().int().min(20).max(250).optional(),
  temperatureC: z.coerce.number().min(30).max(45).optional(),
  weightKg: z.coerce.number().min(0.5).max(400).optional(),
  prescriptions: z
    .array(
      z.object({
        medication: z.string().trim().min(1),
        dosage: z.string().trim().min(1),
        frequency: z.string().trim().min(1),
        days: z.coerce.number().int().min(1).max(365),
      }),
    )
    .default([]),
});

/** Finishing a visit: stores the notes, completes the appointment and drafts the invoice in one go. */
appointmentsRouter.post("/:id/consultation", allow("DOCTOR"), async (req, res) => {
  const { prescriptions, ...data } = consultationInput.parse(req.body);
  const current = await prisma().appointment.findUnique({ where: { id: param(req, "id") }, include: { doctor: true } });
  if (!current) throw notFound("Appointment");
  if (current.doctorId !== req.user!.id) throw new HttpError(403, "This is another doctor's appointment");
  if (!["CHECKED_IN", "IN_PROGRESS"].includes(current.status)) {
    throw new HttpError(409, "The patient must be checked in first");
  }

  const consultation = await prisma().$transaction(async (tx) => {
    const c = await tx.consultation.create({
      data: { ...data, appointmentId: current.id, prescriptions: { create: prescriptions } },
      include: { prescriptions: true },
    });
    await tx.appointment.update({ where: { id: current.id }, data: { status: "COMPLETED" } });
    const year = new Date().getFullYear();
    const count = await tx.invoice.count({ where: { number: { startsWith: `INV-${year}-` } } });
    await tx.invoice.create({
      data: {
        number: `INV-${year}-${String(count + 1).padStart(5, "0")}`,
        patientId: current.patientId,
        appointmentId: current.id,
        lines: { create: [{ description: `Consultation (${current.durationMin} min) – ${current.doctor.specialty ?? "General"}`, unitPriceCents: current.durationMin >= 40 ? 9500 : 6000 }] },
      },
    });
    return c;
  });
  logAccess(req, "record-visit", "appointment", current.id, data.diagnosis);
  res.status(201).json(consultation);
});
