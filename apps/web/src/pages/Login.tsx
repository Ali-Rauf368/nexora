import { Stethoscope } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ErrorNote, Field, Input } from "../components/ui";
import { useAuth } from "../lib/auth";

const DEMO = [
  { email: "reception@nexora.clinic", label: "Reception" },
  { email: "dr.haddad@nexora.clinic", label: "Doctor" },
  { email: "admin@nexora.clinic", label: "Admin" },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-side p-12 text-side-fg md:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-white">
            <Stethoscope size={21} />
          </span>
          <span className="text-lg font-extrabold text-white">Nexora Clinic</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight text-white">The front desk, the consulting room and billing, on one screen.</h1>
          <p className="mt-4 max-w-md">Book patients, see who's waiting, record visits and prescriptions, and send invoices without paperwork.</p>
        </div>
        <p className="text-xs opacity-60">Every access to a patient record is logged.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold">Sign in</h2>
            <p className="mt-1 text-sm text-fg-3">Use your clinic account.</p>
          </div>
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" className="w-full py-2.5" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {import.meta.env.DEV && (
            <div className="rounded-xl bg-soft p-3 text-xs text-fg-2">
              <div className="mb-2 font-semibold">Demo accounts (password clinic-demo-2026)</div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO.map((d) => (
                  <button
                    type="button"
                    key={d.email}
                    className="rounded-lg bg-card px-2.5 py-1 font-semibold hover:text-brand"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword("clinic-demo-2026");
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
