import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppointmentActions, BookModal } from "../components/appointments";
import { AllergyFlag, Button, Card, Empty, ErrorNote, Loading, PageHeader, StatusPill } from "../components/ui";
import type { Appointment } from "../lib/api";
import { useUser } from "../lib/auth";
import { eur, fullName, time } from "../lib/format";
import { useFetch } from "../lib/useFetch";

interface Dashboard {
  today: (Appointment & { patient: Appointment["patient"] })[];
  stats: { appointmentsToday: number; waiting: number; newPatients30d: number; openInvoicesCents: number; openInvoices: number; revenue30dCents: number };
  week: { date: string; completed: number; missed: number; other: number }[];
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-fg-3">{label}</div>
      <div className="mt-2 text-3xl font-extrabold tabular-nums">{value}</div>
      {note && <div className="mt-1 text-xs text-fg-3">{note}</div>}
    </Card>
  );
}

export function TodayPage() {
  const user = useUser();
  const { data, error, reload } = useFetch<Dashboard>("/dashboard");
  const [booking, setBooking] = useState(false);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const isDoctor = user.role === "DOCTOR";

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const { stats } = data;
  const active = data.today.filter((a) => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status));
  const done = data.today.length - active.length;

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ").slice(-1)[0]}`}
        subtitle={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        actions={!isDoctor && <Button onClick={() => setBooking(true)}><CalendarPlus size={16} /> Book appointment</Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={isDoctor ? "My patients today" : "Appointments today"} value={stats.appointmentsToday} note={`${done} finished`} />
        <Stat label="In waiting room" value={stats.waiting} />
        {isDoctor ? (
          <Stat label="New patients (30 d)" value={stats.newPatients30d} />
        ) : (
          <>
            <Stat label="Unpaid invoices" value={eur(stats.openInvoicesCents)} note={`${stats.openInvoices} invoices`} />
            <Stat label="Paid (30 d)" value={eur(stats.revenue30dCents)} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex items-center justify-between border-b border-edge px-5 py-4">
            <h2 className="font-bold">{isDoctor ? "My queue" : "Patient flow"}</h2>
            <Link to="/schedule" className="text-sm font-semibold text-brand">Full schedule →</Link>
          </div>
          {active.length === 0 ? (
            <Empty>Nobody else is booked for today.</Empty>
          ) : (
            <ul className="divide-y divide-edge">
              {active.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-12 font-bold tabular-nums">{time(a.startsAt)}</span>
                  <span className="h-8 w-1 rounded-full" style={{ background: a.doctor.color ?? "#888" }} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/patients/${a.patient.id}`} className="font-semibold hover:text-brand">{fullName(a.patient)}</Link>
                    <div className="text-xs text-fg-3">{a.reason}{!isDoctor && ` · ${a.doctor.name}`}</div>
                  </div>
                  <AllergyFlag allergies={a.patient.allergies} />
                  <StatusPill status={a.status} />
                  <AppointmentActions appt={a} onChange={reload} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Last 7 days</h2>
          <p className="mb-3 text-xs text-fg-3">Visits completed vs. missed or cancelled</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data.week.map((d) => ({ ...d, day: new Date(d.date).toLocaleDateString("en-GB", { weekday: "short" }) }))}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--fg-3)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} stroke="var(--fg-3)" />
                <Tooltip cursor={{ fill: "var(--soft)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--edge)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="var(--brand)" />
                <Bar dataKey="missed" name="Missed" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      {booking && <BookModal onClose={() => setBooking(false)} onBooked={() => { setBooking(false); reload(); }} />}
    </>
  );
}
