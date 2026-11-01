export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    credentials: "include",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event("nexora:signed-out"));
    const detail = data.issues?.[0] ? `: ${data.issues[0].path} ${data.issues[0].message}` : "";
    throw new ApiError(res.status, (data.error ?? `Request failed (${res.status})`) + detail);
  }
  return data as T;
}

export type Role = "ADMIN" | "DOCTOR" | "RECEPTION";
export type AppointmentStatus = "SCHEDULED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface Staff extends User {
  specialty: string | null;
  color: string | null;
  active: boolean;
}
export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: "FEMALE" | "MALE" | "OTHER";
  phone: string;
  email: string | null;
  address: string | null;
  bloodType: string | null;
  allergies: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  createdAt: string;
  lastVisit?: string | null;
}
export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  days: number;
}
export interface Consultation {
  id: string;
  diagnosis: string;
  notes: string | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulse: number | null;
  temperatureC: string | null;
  weightKg: string | null;
  prescriptions: Prescription[];
}
export interface Appointment {
  id: string;
  startsAt: string;
  durationMin: number;
  reason: string;
  status: AppointmentStatus;
  patient: Pick<Patient, "id" | "mrn" | "firstName" | "lastName" | "allergies">;
  doctor: { id: string; name: string; color: string | null };
  consultation: { id: string } | null;
}
export interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  createdAt: string;
  issuedAt: string | null;
  paidAt: string | null;
  lines: InvoiceLine[];
  patient?: Pick<Patient, "id" | "mrn" | "firstName" | "lastName" | "insuranceProvider">;
}
export interface PatientChart extends Patient {
  appointments: (Omit<Appointment, "patient" | "consultation"> & { consultation?: Consultation | null })[];
  invoices: Invoice[];
}
export interface AccessEntry {
  _id: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary?: string;
  ip?: string;
  at: string;
}
