import clsx from "clsx";
import { CalendarDays, ClipboardList, LayoutGrid, LogOut, Moon, ReceiptText, ShieldCheck, Stethoscope, Sun, Users } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import type { Role } from "../lib/api";
import { useAuth, useUser } from "../lib/auth";

const NAV: { to: string; label: string; icon: typeof Users; roles?: Role[] }[] = [
  { to: "/", label: "Today", icon: LayoutGrid },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/patients", label: "Patients", icon: ClipboardList },
  { to: "/billing", label: "Billing", icon: ReceiptText, roles: ["ADMIN", "RECEPTION"] },
  { to: "/staff", label: "Staff", icon: Users, roles: ["ADMIN"] },
  { to: "/access-log", label: "Access log", icon: ShieldCheck, roles: ["ADMIN"] },
];

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrator", DOCTOR: "Doctor", RECEPTION: "Reception" };

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("nexora.theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
    setDark(next);
  };
  return { dark, toggle };
}

export function Layout() {
  const user = useUser();
  const { logout } = useAuth();
  const { dark, toggle } = useTheme();
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-side text-side-fg md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500 text-white">
            <Stethoscope size={19} />
          </span>
          <div className="leading-tight">
            <div className="font-extrabold text-white">Nexora</div>
            <div className="text-[11px] font-medium uppercase tracking-widest opacity-70">Clinic</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition", isActive ? "bg-white/12 text-white" : "hover:bg-white/6 hover:text-white")
              }
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-4 md:block">
          <div className="text-sm font-semibold text-white">{user.name}</div>
          <div className="text-xs opacity-70">{ROLE_LABEL[user.role]}</div>
          <div className="mt-3 flex gap-1">
            <button onClick={toggle} className="rounded-lg p-2 hover:bg-white/10" aria-label="Toggle dark mode">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={logout} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/10">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mb-4 flex items-center justify-end gap-2 md:hidden">
          <button onClick={toggle} className="rounded-lg p-2 text-fg-2 hover:bg-soft" aria-label="Toggle dark mode">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={logout} className="rounded-lg px-2 py-2 text-sm text-fg-2 hover:bg-soft">
            Sign out
          </button>
        </div>
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
