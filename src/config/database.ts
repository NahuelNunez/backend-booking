import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

// An idle connection dying (e.g. a database restart) emits "error" here.
// Without a listener that event is uncaught and takes the whole process down.
pool.on("error", (error) => {
  console.error("Idle database connection failed", error);
});

// Runs fn inside one transaction: every write commits together or none do.
export const withTransaction = async <T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  let discardClient = false;

  // The pool drops its own listener while a client is checked out, so a
  // connection lost mid-transaction would otherwise be an uncaught "error".
  const onClientError = (error: Error) => {
    discardClient = true;
    console.error("Database connection failed during a transaction", error);
  };
  client.on("error", onClientError);

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError: unknown) {
      // Keep throwing the original error; it is the one that explains the failure.
      discardClient = true;
      console.error("ROLLBACK failed", rollbackError);
    }
    throw error;
  } finally {
    client.removeListener("error", onClientError);
    client.release(discardClient);
  }
};
