import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import type { Role } from "./lib/api";
import { AuthProvider, useAuth } from "./lib/auth";
import { AccessLogPage } from "./pages/AccessLog";
import { BillingPage } from "./pages/Billing";
import { LoginPage } from "./pages/Login";
import { PatientChartPage } from "./pages/PatientChart";
import { PatientsPage } from "./pages/Patients";
import { SchedulePage } from "./pages/Schedule";
import { StaffPage } from "./pages/Staff";
import { TodayPage } from "./pages/Today";

function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={<TodayPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:id" element={<PatientChartPage />} />
        <Route path="billing" element={<Guard roles={["ADMIN", "RECEPTION"]}><BillingPage /></Guard>} />
        <Route path="staff" element={<Guard roles={["ADMIN"]}><StaffPage /></Guard>} />
        <Route path="access-log" element={<Guard roles={["ADMIN"]}><AccessLogPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
