import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { allow, requireAuth } from "./auth";
import { config } from "./config";
import { errorHandler, HttpError } from "./lib/http";
import { activityRouter } from "./routes/activity";
import { appointmentsRouter } from "./routes/appointments";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { invoicesRouter } from "./routes/invoices";
import { patientsRouter } from "./routes/patients";
import { staffRouter } from "./routes/staff";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config().CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api", requireAuth);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/patients", patientsRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/invoices", allow("ADMIN", "RECEPTION"), invoicesRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/activity", allow("ADMIN"), activityRouter);
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));
  app.use(errorHandler);
  return app;
}
