import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid input", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  }
  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal server error" });
}

/** Route params are always strings in Express 5 handlers we define; this narrows the type. */
export const param = (req: Request, name: string) => String(req.params[name]);
