/**
 * Resets the database to a realistic demo clinic: staff, ~60 patients, three weeks of appointments
 * (two past, one ahead) with visit notes and invoices for the completed ones. Dev only.
 */
import { AccessLog, connectMongo, disconnectMongo } from "../db/mongo";
import { disconnectPrisma, prisma, type AppointmentStatus, type Sex } from "../db/prisma";
import { hashPassword } from "../lib/password";

export const DEMO_PASSWORD = "clinic-demo-2026";

// Small seeded PRNG so every reset produces the same clinic.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const STAFF = [
  { email: "admin@nexora.clinic", name: "Miriam Okafor", role: "ADMIN" },
  { email: "reception@nexora.clinic", name: "Jonas Becker", role: "RECEPTION" },
  { email: "dr.haddad@nexora.clinic", name: "Dr. Leila Haddad", role: "DOCTOR", specialty: "General Practice", color: "#0ea5e9" },
  { email: "dr.novak@nexora.clinic", name: "Dr. Tomasz Novak", role: "DOCTOR", specialty: "Pediatrics", color: "#f59e0b" },
  { email: "dr.mensah@nexora.clinic", name: "Dr. Ama Mensah", role: "DOCTOR", specialty: "Internal Medicine", color: "#10b981" },
] as const;

const FIRST = { FEMALE: ["Anna", "Fatima", "Sofia", "Mei", "Elif", "Hannah", "Priya", "Lena", "Amara", "Julia", "Nora", "Yara"], MALE: ["Lukas", "Omar", "Mateo", "Kenji", "Emre", "David", "Arjun", "Felix", "Kwame", "Noah", "Ivan", "Samir"], OTHER: ["Alex", "Robin", "Kim"] };
const LAST = ["Schmidt", "Yilmaz", "Nguyen", "Kowalski", "Rossi", "Ahmed", "Fischer", "Silva", "Müller", "Osei", "Tanaka", "Weber", "Haddad", "Petrov", "Garcia", "Klein", "Brown", "Wagner"];
const INSURERS = ["AOK", "TK", "Barmer", "DAK", "Private"];
const ALLERGIES = [null, null, null, null, "Penicillin", "Peanuts", "Latex", "Ibuprofen"];
const REASONS = ["Check-up", "Persistent cough", "Back pain", "Follow-up", "Vaccination", "Headaches", "Skin rash", "Blood pressure review", "Fever", "Fatigue"];
const DIAGNOSES: Record<string, [string, { medication: string; dosage: string; frequency: string; days: number }[]]> = {
  "Check-up": ["Healthy, no findings", []],
  "Persistent cough": ["Acute bronchitis", [{ medication: "Ambroxol", dosage: "30 mg", frequency: "3× daily", days: 7 }]],
  "Back pain": ["Lumbar muscle strain", [{ medication: "Ibuprofen", dosage: "400 mg", frequency: "up to 3× daily", days: 5 }]],
  "Follow-up": ["Improving, continue treatment", []],
  Vaccination: ["Influenza vaccine administered", []],
  Headaches: ["Tension-type headache", [{ medication: "Paracetamol", dosage: "500 mg", frequency: "as needed, max 4× daily", days: 5 }]],
  "Skin rash": ["Contact dermatitis", [{ medication: "Hydrocortisone cream 1%", dosage: "thin layer", frequency: "2× daily", days: 10 }]],
  "Blood pressure review": ["Essential hypertension, controlled", [{ medication: "Ramipril", dosage: "5 mg", frequency: "1× daily", days: 90 }]],
  Fever: ["Viral infection", [{ medication: "Paracetamol", dosage: "500 mg", frequency: "every 6 h if > 38.5 °C", days: 3 }]],
  Fatigue: ["Iron deficiency, labs ordered", [{ medication: "Ferrous sulfate", dosage: "100 mg", frequency: "1× daily", days: 60 }]],
};

async function main() {
  const db = prisma();
  await connectMongo();
  await db.$transaction([
    db.invoiceLine.deleteMany(),
    db.invoice.deleteMany(),
    db.prescription.deleteMany(),
    db.consultation.deleteMany(),
    db.appointment.deleteMany(),
    db.patient.deleteMany(),
    db.user.deleteMany(),
  ]);
  await AccessLog.deleteMany({});

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const staff = [];
  for (const s of STAFF) staff.push(await db.user.create({ data: { ...s, passwordHash } }));
  const doctors = staff.filter((s) => s.role === "DOCTOR");

  const patients = [];
  for (let i = 0; i < 60; i++) {
    const sex: Sex = rand() < 0.05 ? "OTHER" : rand() < 0.5 ? "FEMALE" : "MALE";
    const firstName = pick(FIRST[sex]);
    const lastName = pick(LAST);
    const insurer = pick(INSURERS);
    patients.push(
      await db.patient.create({
        data: {
          mrn: `MRN-${String(1001 + i).padStart(6, "0")}`,
          firstName,
          lastName,
          sex,
          dateOfBirth: new Date(Date.UTC(int(1940, 2022), int(0, 11), int(1, 28))),
          phone: `+49 30 ${int(1000000, 9999999)}`,
          email: rand() < 0.7 ? `${firstName}.${lastName}${i}@example.com`.toLowerCase().replace("ü", "ue") : null,
          address: `${pick(["Linden", "Garten", "Berg", "Schul", "Park"])}straße ${int(1, 120)}, 10${int(100, 999)} Berlin`,
          bloodType: pick(["A+", "A-", "B+", "O+", "O-", "AB+", null]),
          allergies: pick(ALLERGIES),
          insuranceProvider: insurer,
          insuranceNumber: insurer === "Private" ? null : `${String.fromCharCode(65 + int(0, 25))}${int(100000000, 999999999)}`,
          createdAt: new Date(Date.now() - int(0, 400) * 86400_000),
        },
      }),
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let invoiceNo = 0;
  for (let dayOffset = -14; dayOffset <= 7; dayOffset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + dayOffset);
    if (dayOffset !== 0 && (day.getDay() === 0 || day.getDay() === 6)) continue; // today is always filled for the demo
    for (const doctor of doctors) {
      // Slots from 08:00 to 16:00, roughly 60% booked.
      for (let minute = 8 * 60; minute < 16 * 60; minute += 20) {
        if (minute === 12 * 60 || rand() > 0.6) continue;
        const startsAt = new Date(day);
        startsAt.setMinutes(minute);
        const patient = pick(patients);
        const reason = pick(REASONS);
        const isPast = startsAt.getTime() < Date.now() - 30 * 60_000;
        let status: AppointmentStatus = "SCHEDULED";
        if (isPast) status = rand() < 0.86 ? "COMPLETED" : rand() < 0.5 ? "NO_SHOW" : "CANCELLED";
        else if (dayOffset === 0 && startsAt.getTime() < Date.now() + 60 * 60_000) status = "CHECKED_IN";

        const appt = await db.appointment.create({ data: { patientId: patient.id, doctorId: doctor.id, startsAt, durationMin: 20, reason, status } });
        if (status !== "COMPLETED") continue;

        const [diagnosis, prescriptions] = DIAGNOSES[reason]!;
        await db.consultation.create({
          data: {
            appointmentId: appt.id,
            diagnosis,
            notes: `Patient presented with ${reason.toLowerCase()}. Examined; plan discussed with patient.`,
            bpSystolic: int(105, 150),
            bpDiastolic: int(65, 95),
            pulse: int(58, 98),
            temperatureC: reason === "Fever" ? 38 + int(2, 12) / 10 : 36 + int(4, 10) / 10,
            weightKg: int(14, 105),
            createdAt: startsAt,
            prescriptions: { create: prescriptions },
          },
        });
        const daysAgo = -dayOffset;
        const invStatus = daysAgo > 7 ? (rand() < 0.8 ? "PAID" : "ISSUED") : daysAgo > 2 ? "ISSUED" : "DRAFT";
        await db.invoice.create({
          data: {
            number: `INV-${startsAt.getFullYear()}-${String(++invoiceNo).padStart(5, "0")}`,
            patientId: patient.id,
            appointmentId: appt.id,
            status: invStatus,
            createdAt: startsAt,
            issuedAt: invStatus === "DRAFT" ? null : startsAt,
            paidAt: invStatus === "PAID" ? new Date(startsAt.getTime() + int(1, 6) * 86400_000) : null,
            lines: {
              create: [
                { description: `Consultation (20 min) – ${doctor.specialty}`, unitPriceCents: 6000 },
                ...(reason === "Vaccination" ? [{ description: "Influenza vaccine", unitPriceCents: 2400 }] : []),
                ...(reason === "Fatigue" ? [{ description: "Blood panel", unitPriceCents: 3500 }] : []),
              ],
            },
          },
        });
      }
    }
  }

  const counts = await Promise.all([db.patient.count(), db.appointment.count(), db.invoice.count()]);
  console.log(`Seeded ${staff.length} staff, ${counts[0]} patients, ${counts[1]} appointments, ${counts[2]} invoices.`);
  console.log(`Sign in with any of: ${STAFF.map((s) => s.email).join(", ")}  (password: ${DEMO_PASSWORD})`);
}

main()
  .then(() => Promise.all([disconnectPrisma(), disconnectMongo()]))
  .catch(async (err) => {
    console.error(err);
    await Promise.all([disconnectPrisma(), disconnectMongo()]);
    process.exit(1);
  });
