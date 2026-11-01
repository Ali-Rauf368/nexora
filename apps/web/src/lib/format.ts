const money = new Intl.NumberFormat("en-DE", { style: "currency", currency: "EUR" });
export const eur = (cents: number) => money.format(cents / 100);
export const invoiceTotal = (lines: { quantity: number; unitPriceCents: number }[]) => lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0);

export const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const dateTime = (iso: string) => `${date(iso)}, ${time(iso)}`;

export function age(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) years--;
  return years;
}

/** YYYY-MM-DD in local time. */
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
