import { Router } from "express";
import { AccessLog } from "../db/mongo";

export const activityRouter = Router();

activityRouter.get("/", async (req, res) => {
  const filter: Record<string, string> = {};
  if (req.query.entityId) filter.entityId = String(req.query.entityId);
  if (req.query.userId) filter.userId = String(req.query.userId);
  const entries = await AccessLog.find(filter).sort({ at: -1 }).limit(200).lean();
  res.json(entries);
});
