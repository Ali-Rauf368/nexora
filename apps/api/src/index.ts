import { createServer } from "node:http";
import { createApp } from "./app";
import { config } from "./config";
import { connectMongo, disconnectMongo } from "./db/mongo";
import { disconnectPrisma, prisma } from "./db/prisma";
import { logger } from "./lib/logger";

async function main() {
  const c = config();
  await Promise.all([connectMongo(), prisma().$queryRaw`SELECT 1`]);
  const server = createServer(createApp());
  server.listen(c.PORT, () => logger.info(`Nexora Clinic API on http://localhost:${c.PORT}`));

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await Promise.all([disconnectPrisma(), disconnectMongo()]);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
