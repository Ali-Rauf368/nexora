import { ArrowLeft, CalendarPlus, Pencil, Pill } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { BookModal } from "../components/appointments";
import { AllergyFlag, Button, Card, Empty, ErrorNote, Loading, StatusPill } from "../components/ui";
import type { PatientChart } from "../lib/api";
import { useUser } from "../lib/auth";
import { age, date, dateTime, eur, fullName, invoiceTotal } from "../lib/format";
import { useFetch } from "../lib/useFetch";
import { PatientForm } from "./Patients";

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export function PatientChartPage() {
  const { id } = useParams();
  const user = useUser();
  const { data: p, error, reload } = useFetch<PatientChart>(`/patients/${id}`);
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const isDesk = user.role !== "DOCTOR";

  if (error) return <ErrorNote message={error} />;
  if (!p) return <Loading />;
  const visits = p.appointments.filter((a) => a.consultation);
  const upcoming = p.appointments.filter((a) => new Date(a.startsAt) > new Date() && a.status === "SCHEDULED").reverse();

  return (
    <>
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg"><ArrowLeft size={15} /> Patients</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{fullName(p)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-3">
            <span className="font-mono">{p.mrn}</span> · {age(p.dateOfBirth)} years · {p.sex.toLowerCase()}
            {p.bloodType && <> · {p.bloodType}</>}
            <AllergyFlag allergies={p.allergies} />
          </p>
        </div>
        {isDesk && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(true)}><Pencil size={15} /> Edit</Button>
            <Button onClick={() => setBooking(true)}><CalendarPlus size={16} /> Book</Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Details</h2>
            <dl className="space-y-3">
              <Info label="Date of birth" value={date(p.dateOfBirth)} />
              <Info label="Phone" value={p.phone} />
              <Info label="Email" value={p.email} />
              <Info label="Address" value={p.address} />
              <Info label="Insurance" value={[p.insuranceProvider, p.insuranceNumber].filter(Boolean).join(" · ")} />
              <Info label="Registered" value={date(p.createdAt)} />
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Upcoming</h2>
            {upcoming.length === 0 ? <p className="text-sm text-fg-3">Nothing booked.</p> : (
              <ul className="space-y-2 text-sm">
                {upcoming.map((a) => <li key={a.id}><b>{dateTime(a.startsAt)}</b><div className="text-xs text-fg-3">{a.doctor.name} · {a.reason}</div></li>)}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {user.role !== "RECEPTION" ? (
            <Card>
              <h2 className="border-b border-edge px-5 py-4 font-bold">Visit history</h2>
              {visits.length === 0 ? <Empty>No recorded visits yet.</Empty> : (
                <ol className="divide-y divide-edge">
                  {visits.map((a) => {
                    const c = a.consultation!;
                    return (
                      <li key={a.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-bold">{c.diagnosis}</span>
                          <span className="text-xs text-fg-3">{dateTime(a.startsAt)} · {a.doctor.name}</span>
                        </div>
                        <div className="mt-1 text-xs text-fg-3">Reason: {a.reason}</div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2">
                          {c.bpSystolic && <span>BP {c.bpSystolic}/{c.bpDiastolic}</span>}
                          {c.pulse && <span>Pulse {c.pulse}</span>}
                          {c.temperatureC && <span>{c.temperatureC} °C</span>}
                          {c.weightKg && <span>{c.weightKg} kg</span>}
                        </div>
                        {c.notes && <p className="mt-2 text-sm text-fg-2">{c.notes}</p>}
                        {c.prescriptions.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {c.prescriptions.map((rx) => (
                              <li key={rx.id} className="flex items-center gap-2 rounded-lg bg-brand-soft px-2.5 py-1 text-xs">
                                <Pill size={13} className="text-brand" /> <b>{rx.medication}</b> {rx.dosage}, {rx.frequency}, {rx.days} days
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          ) : (
            <Card>
              <h2 className="border-b border-edge px-5 py-4 font-bold">Appointments</h2>
              {p.appointments.length === 0 ? <Empty>No appointments yet.</Empty> : (
                <ul className="divide-y divide-edge">
                  {p.appointments.slice(0, 25).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span>{dateTime(a.startsAt)} · {a.doctor.name} · <span className="text-fg-3">{a.reason}</span></span>
                      <StatusPill status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="px-5 pb-4 text-xs text-fg-3">Clinical notes are visible to doctors only.</p>
            </Card>
          )}
          {isDesk && (
            <Card>
              <h2 className="border-b border-edge px-5 py-4 font-bold">Invoices</h2>
              {p.invoices.length === 0 ? <Empty>No invoices.</Empty> : (
                <ul className="divide-y divide-edge">
                  {p.invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span className="font-mono text-xs">{inv.number}</span>
                      <span className="text-fg-3">{date(inv.createdAt)}</span>
                      <span className="ml-auto font-semibold tabular-nums">{eur(invoiceTotal(inv.lines))}</span>
                      <StatusPill status={inv.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
      {editing && <PatientForm patient={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
      {booking && <BookModal patient={p} onClose={() => setBooking(false)} onBooked={() => { setBooking(false); reload(); }} />}
    </>
  );
}
