import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select } from "../components/ui";
import { api, type Role, type Staff } from "../lib/api";
import { useUser } from "../lib/auth";
import { useFetch } from "../lib/useFetch";

export function StaffPage() {
  const me = useUser();
  const { data, error, reload } = useFetch<Staff[]>("/staff");
  const [adding, setAdding] = useState(false);

  async function toggle(s: Staff) {
    try {
      await api(`/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Staff" subtitle="Who can sign in, and what they can do." actions={<Button onClick={() => setAdding(true)}><UserPlus size={16} /> Add staff</Button>} />
      <ErrorNote message={error} />
      <Card className="overflow-x-auto">
        {!data ? <Loading /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-3">
              <tr className="border-b border-edge">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {data.map((s) => (
                <tr key={s.id} className={s.active ? "" : "opacity-50"}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 font-semibold">
                      {s.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />}
                      {s.name}
                    </div>
                    {s.specialty && <div className="text-xs text-fg-3">{s.specialty}</div>}
                  </td>
                  <td className="px-3 py-3 capitalize text-fg-2">{s.role.toLowerCase()}</td>
                  <td className="px-3 py-3 text-fg-2">{s.email}</td>
                  <td className="px-5 py-3 text-right">
                    {s.id !== me.id && <Button variant={s.active ? "danger" : "soft"} onClick={() => toggle(s)}>{s.active ? "Deactivate" : "Reactivate"}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {adding && <AddStaff onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </>
  );
}

function AddStaff({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "DOCTOR" as Role, specialty: "", password: "" });
  const [error, setError] = useState<string>();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/staff", { method: "POST", body: form });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Modal title="Add staff member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Full name"><Input value={form.name} onChange={set("name")} required /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required /></Field>
        <Field label="Role">
          <Select value={form.role} onChange={set("role")}>
            <option value="DOCTOR">Doctor</option>
            <option value="RECEPTION">Reception</option>
            <option value="ADMIN">Administrator</option>
          </Select>
        </Field>
        {form.role === "DOCTOR" && <Field label="Specialty"><Input value={form.specialty} onChange={set("specialty")} placeholder="General Practice" /></Field>}
        <Field label="Initial password" hint="At least 10 characters. Share it with them securely."><Input type="password" value={form.password} onChange={set("password")} required minLength={10} /></Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button>Add</Button>
        </div>
      </form>
    </Modal>
  );
}
