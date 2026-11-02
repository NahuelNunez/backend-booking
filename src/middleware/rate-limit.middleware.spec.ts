import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it, mock } from "node:test";

// env.ts exits the process when these are missing, so set them before importing the app.
// The database URL points nowhere on purpose: these requests fail after the limiter.
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.DATABASE_URL = "postgres://nobody:nobody@127.0.0.1:1/none";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-test";

const { app } = await import("../app.js");

const VALID_SIGNUP = JSON.stringify({
  owner: {
    fullName: "Ana Perez",
    email: "ana@example.com",
    password: "a-long-password",
    takesAppointments: true,
  },
  business: { name: "El Rey", slug: "el-rey" },
  location: { name: "Centro", timezone: "UTC", currencyCode: "USD" },
});

describe("signup rate limit", () => {
  let server: Server;
  let signupUrl: string;

  before(async () => {
    // The unreachable database logs an expected error for every allowed attempt.
    mock.method(console, "error", () => {});
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    signupUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/businesses`;
  });

  after(() => {
    server.close();
    mock.restoreAll();
  });

  const post = (body: string) =>
    fetch(signupUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

  it("doesn't count requests that fail validation", async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await post("{}");
      assert.equal(response.status, 422);
    }
  });

  it("blocks the 11th valid attempt in the standard error format", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await post(VALID_SIGNUP);
      assert.notEqual(response.status, 429);
    }

    const blocked = await post(VALID_SIGNUP);
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, "RATE_LIMITED");
  });
});
