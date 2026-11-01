import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, type Appointment, type AppointmentStatus, type Patient, type Staff } from "../lib/api";
import { useUser } from "../lib/auth";
import { fullName, isoDay } from "../lib/format";
import { useFetch } from "../lib/useFetch";
import { Button, ErrorNote, Field, Input, Modal, Select, Textarea } from "./ui";

type Appt = Pick<Appointment, "id" | "status" | "doctor" | "patient" | "reason">;

/** The buttons that move an appointment forward, depending on who is signed in. */
export function AppointmentActions({ appt, onChange }: { appt: Appt; onChange: () => void }) {
  const user = useUser();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string>();

  async function setStatus(status: AppointmentStatus) {
    setError(undefined);
    try {
      await api(`/appointments/${appt.id}/status`, { method: "PATCH", body: { status } });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const isDesk = user.role !== "DOCTOR";
  const isMine = user.role === "DOCTOR" && appt.doctor.id === user.id;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {isDesk && appt.status === "SCHEDULED" && (
        <>
          <Button variant="soft" onClick={() => setStatus("CHECKED_IN")}>Check in</Button>
          <Button variant="ghost" onClick={() => setStatus("NO_SHOW")}>No-show</Button>
          <Button variant="danger" onClick={() => confirm("Cancel this appointment?") && setStatus("CANCELLED")}>Cancel</Button>
        </>
      )}
      {isMine && appt.status === "CHECKED_IN" && <Button variant="soft" onClick={() => setStatus("IN_PROGRESS")}>Call in</Button>}
      {isMine && (appt.status === "CHECKED_IN" || appt.status === "IN_PROGRESS") && <Button onClick={() => setRecording(true)}>Record visit</Button>}
      {error && <span className="w-full text-right text-xs text-rose-600">{error}</span>}
      {recording && (
        <ConsultationModal
          appt={appt}
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

const emptyRx = { medication: "", dosage: "", frequency: "", days: 7 };

function ConsultationModal({ appt, onClose, onSaved }: { appt: Appt; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ diagnosis: "", notes: "", bpSystolic: "", bpDiastolic: "", pulse: "", temperatureC: "", weightKg: "" });
  const [rx, setRx] = useState<(typeof emptyRx)[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      await api(`/appointments/${appt.id}/consultation`, { method: "POST", body: { ...body, prescriptions: rx.filter((r) => r.medication) } });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Visit: ${fullName(appt.patient)}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-fg-3">
          Reason: {appt.reason}
          {appt.patient.allergies && <span className="ml-2 font-bold text-rose-600">⚠ Allergy: {appt.patient.allergies}</span>}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="BP systolic"><Input inputMode="numeric" value={form.bpSystolic} onChange={set("bpSystolic")} placeholder="120" /></Field>
          <Field label="BP diastolic"><Input inputMode="numeric" value={form.bpDiastolic} onChange={set("bpDiastolic")} placeholder="80" /></Field>
          <Field label="Pulse"><Input inputMode="numeric" value={form.pulse} onChange={set("pulse")} placeholder="72" /></Field>
          <Field label="Temp °C"><Input inputMode="decimal" value={form.temperatureC} onChange={set("temperatureC")} placeholder="36.8" /></Field>
          <Field label="Weight kg"><Input inputMode="decimal" value={form.weightKg} onChange={set("weightKg")} /></Field>
        </div>
        <Field label="Diagnosis"><Input value={form.diagnosis} onChange={set("diagnosis")} required /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={set("notes")} /></Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-fg-2">Prescriptions</span>
            <Button type="button" variant="ghost" onClick={() => setRx([...rx, { ...emptyRx }])}><Plus size={15} /> Add</Button>
          </div>
          {rx.length === 0 && <p className="text-xs text-fg-3">None</p>}
          <div className="space-y-2">
            {rx.map((r, i) => {
              const upd = (k: keyof typeof emptyRx) => (e: { target: { value: string } }) =>
                setRx(rx.map((x, j) => (j === i ? { ...x, [k]: k === "days" ? Number(e.target.value) : e.target.value } : x)));
              return (
                <div key={i} className="grid grid-cols-[2fr_1fr_1.5fr_70px_auto] gap-2">
                  <Input placeholder="Medication" value={r.medication} onChange={upd("medication")} required />
                  <Input placeholder="Dosage" value={r.dosage} onChange={upd("dosage")} required />
                  <Input placeholder="Frequency" value={r.frequency} onChange={upd("frequency")} required />
                  <Input type="number" min={1} aria-label="Days" value={r.days} onChange={upd("days")} />
                  <Button type="button" variant="danger" aria-label="Remove" onClick={() => setRx(rx.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
                </div>
              );
            })}
          </div>
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy}>Complete visit</Button>
        </div>
        <p className="text-right text-xs text-fg-3">Completing the visit drafts an invoice for reception.</p>
      </form>
    </Modal>
  );
}

export function BookModal({ onClose, onBooked, patient, defaultDate }: { onClose: () => void; onBooked: () => void; patient?: Patient; defaultDate?: string }) {
  const { data: doctors } = useFetch<Staff[]>("/staff?role=DOCTOR");
  const [query, setQuery] = useState("");
  const { data: results } = useFetch<Patient[]>(!patient && query.length >= 2 ? `/patients?q=${encodeURIComponent(query)}` : null);
  const [chosen, setChosen] = useState<Patient | undefined>(patient);
  const [form, setForm] = useState({ doctorId: "", date: defaultDate ?? isoDay(), time: "09:00", durationMin: "20", reason: "" });
  const [error, setError] = useState<string>();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!chosen) return setError("Choose a patient");
    try {
      await api("/appointments", {
        method: "POST",
        body: { patientId: chosen.id, doctorId: form.doctorId, startsAt: new Date(`${form.date}T${form.time}`).toISOString(), durationMin: form.durationMin, reason: form.reason },
      });
      onBooked();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Modal title="Book appointment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Patient">
          {chosen ? (
            <div className="flex items-center justify-between rounded-xl bg-soft px-3 py-2 text-sm">
              <span><b>{fullName(chosen)}</b> <span className="text-fg-3">{chosen.mrn}</span></span>
              {!patient && <button type="button" className="text-xs font-semibold text-brand" onClick={() => setChosen(undefined)}>Change</button>}
            </div>
          ) : (
            <>
              <Input autoFocus placeholder="Search name, MRN or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
              {results && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-edge">
                  {results.length === 0 && <p className="p-2 text-xs text-fg-3">No match. Register the patient first.</p>}
                  {results.slice(0, 8).map((p) => (
                    <button type="button" key={p.id} onClick={() => setChosen(p)} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-soft">
                      {fullName(p)} <span className="text-fg-3">· {p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Field>
        <Field label="Doctor">
          <Select value={form.doctorId} onChange={set("doctorId")} required>
            <option value="">Choose…</option>
            {doctors?.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Date"><Input type="date" value={form.date} onChange={set("date")} required /></Field>
          <Field label="Time"><Input type="time" step={300} value={form.time} onChange={set("time")} required /></Field>
          <Field label="Length">
            <Select value={form.durationMin} onChange={set("durationMin")}>
              {[10, 20, 30, 40, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Reason"><Input value={form.reason} onChange={set("reason")} placeholder="e.g. Follow-up" required /></Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>Book</Button>
        </div>
      </form>
    </Modal>
  );
}
