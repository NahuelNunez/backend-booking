import { app } from "./app.js";
import { pool } from "./config/database.js";
import { env } from "./config/env.js";

// Express 5 also calls this on startup failures such as a port already in use.
const server = app.listen(env.PORT, (error?: Error) => {
  if (error) {
    console.error("API failed to start", error);
    process.exit(1);
  }
  console.log(`API listening on http://localhost:${env.PORT}`);
});

const SHUTDOWN_TIMEOUT_MS = 10_000;

const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`${signal} received, shutting down`);

  // A stuck request must not keep the process alive forever.
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
};

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
