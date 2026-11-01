import { Search, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AllergyFlag, Button, Card, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select } from "../components/ui";
import { api, type Patient } from "../lib/api";
import { useUser } from "../lib/auth";
import { age, date } from "../lib/format";
import { useFetch } from "../lib/useFetch";

export function PatientsPage() {
  const user = useUser();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error } = useFetch<Patient[]>(`/patients${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`);

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={data ? `${data.length}${data.length === 200 ? "+" : ""} records` : undefined}
        actions={user.role !== "DOCTOR" && <Button onClick={() => setAdding(true)}><UserPlus size={16} /> Register patient</Button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
        <Input className="pl-9" placeholder="Search by name, MRN or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ErrorNote message={error} />
      <Card className="overflow-x-auto">
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Empty>No patients match “{debounced}”.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-3">
              <tr className="border-b border-edge">
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-3 py-3 font-semibold">MRN</th>
                <th className="px-3 py-3 font-semibold">Age</th>
                <th className="px-3 py-3 font-semibold">Phone</th>
                <th className="px-3 py-3 font-semibold">Insurance</th>
                <th className="px-5 py-3 font-semibold">Last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-soft/60">
                  <td className="px-5 py-3">
                    <Link to={`/patients/${p.id}`} className="font-semibold hover:text-brand">{p.lastName}, {p.firstName}</Link>
                    <div className="mt-0.5"><AllergyFlag allergies={p.allergies} /></div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-fg-2">{p.mrn}</td>
                  <td className="px-3 py-3 tabular-nums">{age(p.dateOfBirth)}</td>
                  <td className="px-3 py-3 text-fg-2">{p.phone}</td>
                  <td className="px-3 py-3 text-fg-2">{p.insuranceProvider ?? "—"}</td>
                  <td className="px-5 py-3 text-fg-2">{p.lastVisit ? date(p.lastVisit) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {adding && <PatientForm onClose={() => setAdding(false)} />}
    </>
  );
}

const blank = { firstName: "", lastName: "", dateOfBirth: "", sex: "FEMALE", phone: "", email: "", address: "", bloodType: "", allergies: "", insuranceProvider: "", insuranceNumber: "" };

/** Registers a new patient, or edits one when `patient` is given. */
export function PatientForm({ patient, onClose, onSaved }: { patient?: Patient; onClose: () => void; onSaved?: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() =>
    patient ? Object.fromEntries(Object.keys(blank).map((k) => [k, k === "dateOfBirth" ? patient.dateOfBirth.slice(0, 10) : ((patient as never)[k] ?? "")])) as typeof blank : blank,
  );
  const [error, setError] = useState<string>();
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (patient) {
        await api(`/patients/${patient.id}`, { method: "PATCH", body: form });
        onSaved?.();
      } else {
        const created = await api<Patient>("/patients", { method: "POST", body: form });
        navigate(`/patients/${created.id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Modal title={patient ? "Edit patient details" : "Register patient"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="First name"><Input value={form.firstName} onChange={set("firstName")} required /></Field>
        <Field label="Last name"><Input value={form.lastName} onChange={set("lastName")} required /></Field>
        <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} required /></Field>
        <Field label="Sex">
          <Select value={form.sex} onChange={set("sex")}>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Phone"><Input type="tel" value={form.phone} onChange={set("phone")} required /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={set("address")} /></Field></div>
        <Field label="Insurance provider"><Input value={form.insuranceProvider} onChange={set("insuranceProvider")} /></Field>
        <Field label="Insurance number"><Input value={form.insuranceNumber} onChange={set("insuranceNumber")} /></Field>
        <Field label="Blood type"><Input value={form.bloodType} onChange={set("bloodType")} placeholder="e.g. A+" /></Field>
        <Field label="Allergies" hint="Shown as a warning wherever the patient appears"><Input value={form.allergies} onChange={set("allergies")} /></Field>
        <div className="sm:col-span-2"><ErrorNote message={error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>{patient ? "Save" : "Register"}</Button>
        </div>
      </form>
    </Modal>
  );
}
