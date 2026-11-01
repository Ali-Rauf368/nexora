import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4100),
  DATABASE_URL: z.string().url(),
  MONGO_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  SESSION_HOURS: z.coerce.number().default(10),
  CORS_ORIGIN: z.string().default("http://localhost:5190"),
  ACCESS_LOG_RETENTION_DAYS: z.coerce.number().default(730),
});

export type Config = z.infer<typeof schema>;
let cached: Config | undefined;

export function config(): Config {
  cached ??= schema.parse(process.env);
  return cached;
}
