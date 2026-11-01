import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button, Card, Empty, ErrorNote, Input, Loading, Modal, PageHeader, StatusPill } from "../components/ui";
import { api, type Invoice, type InvoiceLine, type InvoiceStatus } from "../lib/api";
import { date, eur, fullName, invoiceTotal } from "../lib/format";
import { useFetch } from "../lib/useFetch";

const TABS: { status?: InvoiceStatus; label: string }[] = [
  { status: "DRAFT", label: "To review" },
  { status: "ISSUED", label: "Awaiting payment" },
  { status: "PAID", label: "Paid" },
  { label: "All" },
];

export function BillingPage() {
  const [tab, setTab] = useState(0);
  const status = TABS[tab]!.status;
  const { data, error, reload } = useFetch<Invoice[]>(`/invoices${status ? `?status=${status}` : ""}`);
  const [open, setOpen] = useState<Invoice>();

  async function move(inv: Invoice, to: "ISSUED" | "PAID" | "VOID") {
    if (to === "VOID" && !confirm(`Void ${inv.number}? This can't be undone.`)) return;
    try {
      await api(`/invoices/${inv.id}/status`, { method: "PATCH", body: { status: to } });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Billing" subtitle="Invoices are drafted automatically when a doctor completes a visit." />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-soft p-1 sm:inline-flex">
        {TABS.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)} className={clsx("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold", i === tab ? "bg-card shadow-sm" : "text-fg-3 hover:text-fg")}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      <Card className="overflow-x-auto">
        {!data ? <Loading /> : data.length === 0 ? <Empty>Nothing here.</Empty> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-3">
              <tr className="border-b border-edge">
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-3 py-3 font-semibold">Patient</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {data.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3 font-mono text-xs">
                    <button className="hover:text-brand" onClick={() => setOpen(inv)}>{inv.number}</button>
                  </td>
                  <td className="px-3 py-3">
                    {inv.patient && <Link to={`/patients/${inv.patient.id}`} className="font-semibold hover:text-brand">{fullName(inv.patient)}</Link>}
                    <div className="text-xs text-fg-3">{inv.patient?.insuranceProvider ?? "Self-pay"}</div>
                  </td>
                  <td className="px-3 py-3 text-fg-2">{date(inv.createdAt)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{eur(invoiceTotal(inv.lines))}</td>
                  <td className="px-3 py-3"><StatusPill status={inv.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {inv.status === "DRAFT" && <Button variant="soft" onClick={() => move(inv, "ISSUED")}>Issue</Button>}
                      {inv.status === "ISSUED" && <Button variant="soft" onClick={() => move(inv, "PAID")}>Mark paid</Button>}
                      {(inv.status === "DRAFT" || inv.status === "ISSUED") && <Button variant="danger" onClick={() => move(inv, "VOID")}>Void</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {open && <InvoiceModal invoice={open} onClose={() => setOpen(undefined)} onSaved={() => { setOpen(undefined); reload(); }} />}
    </>
  );
}

function InvoiceModal({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: () => void }) {
  const editable = invoice.status === "DRAFT";
  const [lines, setLines] = useState<InvoiceLine[]>(invoice.lines.map(({ description, quantity, unitPriceCents }) => ({ description, quantity, unitPriceCents })));
  const [error, setError] = useState<string>();

  async function save() {
    try {
      await api(`/invoices/${invoice.id}/lines`, { method: "PUT", body: lines });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const upd = (i: number, patch: Partial<InvoiceLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <Modal title={invoice.number} onClose={onClose} wide>
      <p className="mb-4 text-sm text-fg-3">
        {invoice.patient && fullName(invoice.patient)} · {date(invoice.createdAt)} · <StatusPill status={invoice.status} />
      </p>
      <div className="space-y-2">
        {lines.map((l, i) =>
          editable ? (
            <div key={i} className="grid grid-cols-[1fr_64px_100px_auto] gap-2">
              <Input value={l.description} onChange={(e) => upd(i, { description: e.target.value })} aria-label="Description" />
              <Input type="number" min={1} value={l.quantity} onChange={(e) => upd(i, { quantity: Number(e.target.value) })} aria-label="Quantity" />
              <Input type="number" min={0} step="0.01" value={l.unitPriceCents / 100} onChange={(e) => upd(i, { unitPriceCents: Math.round(Number(e.target.value) * 100) })} aria-label="Unit price €" />
              <Button variant="danger" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
            </div>
          ) : (
            <div key={i} className="flex justify-between text-sm">
              <span>{l.quantity} × {l.description}</span>
              <span className="tabular-nums">{eur(l.quantity * l.unitPriceCents)}</span>
            </div>
          ),
        )}
      </div>
      {editable && <Button variant="ghost" className="mt-2" onClick={() => setLines([...lines, { description: "", quantity: 1, unitPriceCents: 0 }])}><Plus size={15} /> Add line</Button>}
      <div className="mt-4 flex justify-between border-t border-edge pt-3 font-bold">
        <span>Total</span>
        <span className="tabular-nums">{eur(invoiceTotal(lines))}</span>
      </div>
      <ErrorNote message={error} />
      {editable && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save lines</Button>
        </div>
      )}
    </Modal>
  );
}
