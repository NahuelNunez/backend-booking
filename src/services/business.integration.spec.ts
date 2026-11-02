import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

// Runs only against a database with schema.sql applied, e.g.
//   TEST_DATABASE_URL=postgres://... pnpm test
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// env.ts exits the process when these are missing, so set them before importing the app.
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.DATABASE_URL = testDatabaseUrl ?? "postgres://nobody:nobody@127.0.0.1:1/none";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-test";

const { app } = await import("../app.js");
const { pool, withTransaction } = await import("../config/database.js");

// Unique per run, so a shared database keeps working and cleanup can't touch real rows.
const runId = randomUUID().slice(0, 8);
const slugPrefix = `it-${runId}`;
const emailPrefix = `it-${runId}-`;

const signupBody = (name: string, overrides?: { email?: string; slug?: string }) =>
  JSON.stringify({
    owner: {
      fullName: "Ana Perez",
      email: overrides?.email ?? `${emailPrefix}${name}@example.com`,
      password: "a-long-password",
      takesAppointments: true,
    },
    business: { name: "El Rey", slug: overrides?.slug ?? `${slugPrefix}-${name}` },
    location: { name: "Centro", timezone: "America/New_York", currencyCode: "USD" },
  });

describe("business signup against Postgres", { skip: !testDatabaseUrl }, () => {
  let server: Server;
  let signupUrl: string;

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    signupUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/businesses`;
  });

  after(async () => {
    const tenants = `SELECT id FROM tenant WHERE slug::text LIKE $1`;
    const slugs = [`${slugPrefix}%`];
    await pool.query(`DELETE FROM staff_location WHERE tenant_id IN (${tenants})`, slugs);
    await pool.query(`DELETE FROM staff WHERE tenant_id IN (${tenants})`, slugs);
    await pool.query(`DELETE FROM location WHERE tenant_id IN (${tenants})`, slugs);
    await pool.query(`DELETE FROM tenant WHERE slug::text LIKE $1`, slugs);
    await pool.query(`DELETE FROM user_account WHERE email::text LIKE $1`, [`${emailPrefix}%`]);
    server.close();
    await pool.end();
  });

  const signup = (body: string) =>
    fetch(signupUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

  const errorCode = async (response: Response) =>
    ((await response.json()) as { error: { code: string } }).error.code;

  it("creates the tenant, owner, location and bookable staff row", async () => {
    const response = await signup(signupBody("created"));
    assert.equal(response.status, 201);

    const text = await response.text();
    assert.equal(text.includes("password"), false);

    const { data } = JSON.parse(text) as { data: { token: string; tenant: { id: string } } };
    assert.equal(data.token.split(".").length, 3);

    const { rows } = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM staff_location WHERE tenant_id = $1`,
      [data.tenant.id],
    );
    assert.equal(rows[0]?.count, 1);
  });

  it("returns 409 EMAIL_TAKEN and rolls back the new tenant", async () => {
    const email = `${emailPrefix}dup@example.com`;
    assert.equal((await signup(signupBody("first", { email }))).status, 201);

    const rolledBackSlug = `${slugPrefix}-rolled-back`;
    const response = await signup(signupBody("second", { email, slug: rolledBackSlug }));
    assert.equal(response.status, 409);
    assert.equal(await errorCode(response), "EMAIL_TAKEN");

    const { rowCount } = await pool.query(`SELECT 1 FROM tenant WHERE slug = $1`, [rolledBackSlug]);
    assert.equal(rowCount, 0);
  });

  it("returns 409 SLUG_TAKEN", async () => {
    const slug = `${slugPrefix}-taken`;
    assert.equal((await signup(signupBody("slug-one", { slug }))).status, 201);

    const response = await signup(signupBody("slug-two", { slug }));
    assert.equal(response.status, 409);
    assert.equal(await errorCode(response), "SLUG_TAKEN");
  });

  it("survives losing the connection mid-transaction", async () => {
    const transaction = withTransaction(async (client) => {
      const { rows } = await client.query<{ pid: number }>(`SELECT pg_backend_pid() AS pid`);
      await pool.query(`SELECT pg_terminate_backend($1)`, [rows[0]?.pid]);
      await client.query(`SELECT pg_sleep(5)`);
    });

    await assert.rejects(transaction);

    // The pool must still work: the dead client was discarded, not reused.
    const { rows } = await pool.query<{ ok: number }>(`SELECT 1 AS ok`);
    assert.equal(rows[0]?.ok, 1);
  });
});
