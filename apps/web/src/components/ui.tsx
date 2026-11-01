import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { AppointmentStatus, InvoiceStatus } from "../lib/api";

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-brand-fg hover:brightness-110",
        variant === "soft" && "bg-brand-soft text-brand hover:brightness-95 dark:hover:brightness-125",
        variant === "ghost" && "text-fg-2 hover:bg-soft",
        variant === "danger" && "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-edge bg-card", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-edge bg-card px-3 py-2 text-sm outline-none placeholder:text-fg-3 focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-fg-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fg-3">{hint}</span>}
    </label>
  );
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(inputCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={clsx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(inputCls, p.className)} />;

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={clsx("w-full rounded-2xl border border-edge bg-card p-6 shadow-2xl", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-fg-3 hover:bg-soft" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{message}</p>;
}

export const Loading = () => <p className="py-10 text-center text-sm text-fg-3">Loading…</p>;
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-10 text-center text-sm text-fg-3">{children}</p>;

const statusStyle: Record<AppointmentStatus | InvoiceStatus, string> = {
  SCHEDULED: "bg-soft text-fg-2",
  CHECKED_IN: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  IN_PROGRESS: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  CANCELLED: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800/60 dark:text-zinc-400",
  NO_SHOW: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  DRAFT: "bg-soft text-fg-2",
  ISSUED: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  VOID: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800/60 dark:text-zinc-400",
};
const statusLabel: Partial<Record<AppointmentStatus | InvoiceStatus, string>> = { CHECKED_IN: "Waiting", IN_PROGRESS: "With doctor", NO_SHOW: "No-show" };

export function StatusPill({ status }: { status: AppointmentStatus | InvoiceStatus }) {
  return (
    <span className={clsx("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyle[status])}>
      {statusLabel[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function AllergyFlag({ allergies }: { allergies: string | null }) {
  if (!allergies) return null;
  return (
    <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" title="Allergy">
      ⚠ {allergies}
    </span>
  );
}
