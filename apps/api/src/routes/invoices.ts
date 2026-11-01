import { Router } from "express";
import { z } from "zod";
import { prisma, type InvoiceStatus } from "../db/prisma";
import { logAccess } from "../lib/access-log";
import { HttpError, notFound, param } from "../lib/http";

export const invoicesRouter = Router();

const include = {
  patient: { select: { id: true, mrn: true, firstName: true, lastName: true, insuranceProvider: true } },
  lines: true,
} as const;

invoicesRouter.get("/", async (req, res) => {
  const status = req.query.status ? (String(req.query.status) as InvoiceStatus) : undefined;
  const invoices = await prisma().invoice.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 300, include });
  res.json(invoices);
});

invoicesRouter.put("/:id/lines", async (req, res) => {
  const lines = z
    .array(z.object({ description: z.string().trim().min(1), quantity: z.coerce.number().int().min(1), unitPriceCents: z.coerce.number().int().min(0) }))
    .min(1)
    .parse(req.body);
  const invoice = await prisma().invoice.findUnique({ where: { id: param(req, "id") } });
  if (!invoice) throw notFound("Invoice");
  if (invoice.status !== "DRAFT") throw new HttpError(409, "Only draft invoices can be edited");
  const updated = await prisma().invoice.update({
    where: { id: invoice.id },
    data: { lines: { deleteMany: {}, create: lines } },
    include,
  });
  logAccess(req, "edit-lines", "invoice", invoice.id, invoice.number);
  res.json(updated);
});

const next: Record<InvoiceStatus, InvoiceStatus[]> = { DRAFT: ["ISSUED", "VOID"], ISSUED: ["PAID", "VOID"], PAID: [], VOID: [] };

invoicesRouter.patch("/:id/status", async (req, res) => {
  const { status } = z.object({ status: z.enum(["ISSUED", "PAID", "VOID"]) }).parse(req.body);
  const invoice = await prisma().invoice.findUnique({ where: { id: param(req, "id") } });
  if (!invoice) throw notFound("Invoice");
  if (!next[invoice.status].includes(status)) throw new HttpError(409, `Cannot change an invoice from ${invoice.status} to ${status}`);
  const now = new Date();
  const updated = await prisma().invoice.update({
    where: { id: invoice.id },
    data: { status, issuedAt: status === "ISSUED" ? now : undefined, paidAt: status === "PAID" ? now : undefined },
    include,
  });
  logAccess(req, `status:${status}`, "invoice", invoice.id, invoice.number);
  res.json(updated);
});
