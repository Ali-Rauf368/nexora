import mongoose, { Schema, model } from "mongoose";
import { config } from "../config";

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config().MONGO_URL, { serverSelectionTimeoutMS: 5000 });
  await AccessLog.syncIndexes();
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

/**
 * Who opened or changed which record. Medical records require a trail of every access,
 * so reads of patient charts are logged too. Append-only; expires after ACCESS_LOG_RETENTION_DAYS.
 */
const accessLogSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    summary: { type: String },
    ip: { type: String },
    at: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);
accessLogSchema.index({ entityType: 1, entityId: 1, at: -1 });
accessLogSchema.index({ at: 1 }, { expireAfterSeconds: Number(process.env.ACCESS_LOG_RETENTION_DAYS ?? 730) * 86400 });
export const AccessLog = model("AccessLog", accessLogSchema);
