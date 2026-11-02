import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

// env.ts exits the process when these are missing, so set them before importing the app.
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.DATABASE_URL = "postgres://nobody:nobody@127.0.0.1:1/none";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-test";

const { app } = await import("../app.js");

const JSON_HEADERS = { "content-type": "application/json" };

describe("API error responses", () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  });

  after(() => {
    server.close();
  });

  const expectError = async (response: Response, status: number, code: string) => {
    assert.equal(response.status, status);
    const body = (await response.json()) as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, code);
  };

  it("serves the health check", async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, data: { status: "ok" } });
  });

  it("returns 404 for unknown routes", async () => {
    await expectError(await fetch(`${baseUrl}/nope`), 404, "NOT_FOUND");
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/businesses`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: "{",
    });
    await expectError(response, 400, "INVALID_JSON");
  });

  it("returns 413 for an oversized body", async () => {
    const response = await fetch(`${baseUrl}/businesses`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ padding: "a".repeat(200_000) }),
    });
    await expectError(response, 413, "PAYLOAD_TOO_LARGE");
  });

  it("returns 415 for an unsupported charset", async () => {
    const response = await fetch(`${baseUrl}/businesses`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=foo" },
      body: "{}",
    });
    await expectError(response, 415, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 422 when the body fails validation", async () => {
    const response = await fetch(`${baseUrl}/businesses`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: "{}",
    });
    await expectError(response, 422, "VALIDATION_ERROR");
  });
});
