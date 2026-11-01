import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AppointmentActions, BookModal } from "../components/appointments";
import { AllergyFlag, Button, Card, Empty, ErrorNote, Input, Loading, PageHeader, StatusPill } from "../components/ui";
import type { Appointment, Staff } from "../lib/api";
import { useUser } from "../lib/auth";
import { fullName, isoDay, time } from "../lib/format";
import { useFetch } from "../lib/useFetch";

const shift = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};

/** One column per doctor, appointments in time order. */
export function SchedulePage() {
  const user = useUser();
  const [day, setDay] = useState(isoDay());
  const [booking, setBooking] = useState(false);
  const { data: doctors } = useFetch<Staff[]>("/staff?role=DOCTOR");
  const { data: appts, error, reload } = useFetch<Appointment[]>(`/appointments?date=${day}`);
  const label = new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const columns = (doctors ?? []).filter((d) => user.role !== "DOCTOR" || d.id === user.id);

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle={label}
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button variant="ghost" aria-label="Previous day" onClick={() => setDay(shift(day, -1))}><ChevronLeft size={18} /></Button>
              <Input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-40" />
              <Button variant="ghost" aria-label="Next day" onClick={() => setDay(shift(day, 1))}><ChevronRight size={18} /></Button>
              {day !== isoDay() && <Button variant="ghost" onClick={() => setDay(isoDay())}>Today</Button>}
            </div>
            {user.role !== "DOCTOR" && <Button onClick={() => setBooking(true)}><CalendarPlus size={16} /> Book</Button>}
          </>
        }
      />
      <ErrorNote message={error} />
      {!appts || !doctors ? (
        <Loading />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}>
          {columns.map((doc) => {
            const list = appts.filter((a) => a.doctor.id === doc.id);
            return (
              <Card key={doc.id} className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-edge px-4 py-3" style={{ borderTop: `4px solid ${doc.color ?? "#888"}` }}>
                  <div className="flex-1">
                    <div className="font-bold">{doc.name}</div>
                    <div className="text-xs text-fg-3">{doc.specialty}</div>
                  </div>
                  <span className="text-xs font-semibold text-fg-3">{list.filter((a) => a.status !== "CANCELLED").length} booked</span>
                </div>
                {list.length === 0 ? (
                  <Empty>Free all day</Empty>
                ) : (
                  <ul className="divide-y divide-edge">
                    {list.map((a) => (
                      <li key={a.id} className={a.status === "CANCELLED" ? "px-4 py-3 opacity-50" : "px-4 py-3"}>
                        <div className="flex items-start gap-3">
                          <div className="w-11 pt-0.5 text-sm font-bold tabular-nums">{time(a.startsAt)}</div>
                          <div className="min-w-0 flex-1">
                            <Link to={`/patients/${a.patient.id}`} className="font-semibold hover:text-brand">{fullName(a.patient)}</Link>
                            <div className="text-xs text-fg-3">{a.reason} · {a.durationMin} min</div>
                            <div className="mt-1 flex flex-wrap gap-1"><StatusPill status={a.status} /><AllergyFlag allergies={a.patient.allergies} /></div>
                          </div>
                        </div>
                        <div className="mt-2"><AppointmentActions appt={a} onChange={reload} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {booking && <BookModal defaultDate={day} onClose={() => setBooking(false)} onBooked={() => { setBooking(false); reload(); }} />}
    </>
  );
}
