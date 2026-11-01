import { Router } from "express";
import { prisma } from "../db/prisma";

export const dashboardRouter = Router();

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

dashboardRouter.get("/", async (req, res) => {
  const db = prisma();
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);
  const isDoctor = req.user!.role === "DOCTOR";
  const mine = isDoctor ? { doctorId: req.user!.id } : {};

  const [todays, newPatients30d, openInvoices, paid30d, week] = await Promise.all([
    db.appointment.findMany({
      where: { ...mine, startsAt: { gte: today, lt: tomorrow } },
      orderBy: { startsAt: "asc" },
      include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } }, doctor: { select: { name: true, color: true } } },
    }),
    db.patient.count({ where: { createdAt: { gte: addDays(today, -30) } } }),
    db.invoice.findMany({ where: { status: "ISSUED" }, include: { lines: true } }),
    db.invoice.findMany({ where: { status: "PAID", paidAt: { gte: addDays(today, -30) } }, include: { lines: true } }),
    db.appointment.findMany({ where: { ...mine, startsAt: { gte: weekStart, lt: tomorrow } }, select: { startsAt: true, status: true } }),
  ]);

  const total = (invs: { lines: { quantity: number; unitPriceCents: number }[] }[]) =>
    invs.reduce((s, i) => s + i.lines.reduce((t, l) => t + l.quantity * l.unitPriceCents, 0), 0);

  const perDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const items = week.filter((a) => startOfDay(a.startsAt).getTime() === day.getTime());
    return {
      date: day.toISOString(),
      completed: items.filter((a) => a.status === "COMPLETED").length,
      missed: items.filter((a) => a.status === "NO_SHOW" || a.status === "CANCELLED").length,
      other: items.filter((a) => !["COMPLETED", "NO_SHOW", "CANCELLED"].includes(a.status)).length,
    };
  });

  res.json({
    today: todays,
    stats: {
      appointmentsToday: todays.filter((a) => a.status !== "CANCELLED").length,
      waiting: todays.filter((a) => a.status === "CHECKED_IN").length,
      newPatients30d,
      openInvoicesCents: total(openInvoices),
      openInvoices: openInvoices.length,
      revenue30dCents: total(paid30d),
    },
    week: perDay,
  });
});
