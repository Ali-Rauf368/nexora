import type { Request } from "express";
import { AccessLog } from "../db/mongo";
import { logger } from "./logger";

/** Records an access-log entry. Never fails the request if MongoDB is briefly unavailable. */
export function logAccess(req: Request, action: string, entityType: string, entityId?: string, summary?: string) {
  const user = req.user;
  if (!user) return;
  AccessLog.create({ userId: user.id, userName: user.name, action, entityType, entityId, summary, ip: req.ip }).catch((err) =>
    logger.warn({ err }, "access log write failed"),
  );
}
