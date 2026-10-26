import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Uses the actual optimized Next server; it never contacts a production app or Auth provider.
const root = fileURLToPath(new URL("../", import.meta.url));
const next = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const origin = "http://127.0.0.1:3107";
let server;
before(async () => {
  server = spawn(
    process.execPath,
    [next, "start", "--hostname", "127.0.0.1", "--port", "3107"],
    {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        SOLARDESK_CLOUD_ENABLED: "false",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Test server startup timed out")),
      30000,
    );
    const ready = (chunk) => {
      if (chunk.toString().includes("Ready in")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout.on("data", ready);
    server.stderr.on("data", () => {}); // Do not print inherited configuration or arbitrary server logs.
    server.once("error", () => {
      clearTimeout(timeout);
      reject(new Error("Test server failed to start"));
    });
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Test server exited before readiness (${code})`));
    });
  });
});
after(() => {
  server?.kill();
});
const get = (path) =>
  fetch(origin + path, { signal: AbortSignal.timeout(10000) });
const post = (body, options = {}) =>
  fetch(origin + "/api/auth", {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...options },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

test("local workspace still renders when shared mode is disabled", async () => {
  const response = await get("/");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /โหมดตัวอย่าง/);
});
test("unconfigured login shows setup state and does not claim a logged-in identity", async () => {
  const response = await get("/login");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /ระบบข้อมูลกลางยังไม่เปิดใช้งาน/);
});
test("disabled shared-data API fails closed with private cache headers", async () => {
  const response = await get("/api/workspace");
  assert.equal(response.status, 503);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(typeof (await response.json()).error, "string");
});
test("private templates fail closed when cloud mode is disabled and are not static public files", async () => {
  const response = await get("/api/document-templates/approval");
  assert.equal(response.status, 503);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.match(response.headers.get("content-type"), /application\/json/);
  await response.text();
  assert.equal((await get("/document-templates/approval.docx")).status, 404);
});
test("unknown document template IDs are rejected before configuration/provider access", async () => {
  const response = await get("/api/document-templates/unknown-form");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  await response.text();
});
test("shared-project registration is refused before provider or secret access", async () => {
  const response = await post({
    action: "signup",
    email: "synthetic@example.invalid",
    password: "synthetic-password",
  });
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control"), /no-store/);
  await response.text();
});
test("cross-origin authentication requests are refused", async () => {
  const response = await post(
    { action: "signout" },
    { origin: "https://untrusted.example" },
  );
  assert.equal(response.status, 403);
  await response.text();
});
test("non-JSON and oversized auth input are rejected before provider access", async () => {
  const invalidType = await post("{}", { "content-type": "application/jsonp" });
  const typeMessage = await invalidType.json();
  assert.equal(invalidType.status, 415, typeMessage.error);
  const oversized = await post({
    action: "signin",
    email: "synthetic@example.invalid",
    password: "x".repeat(5000),
  });
  assert.equal(oversized.status, 413);
  await oversized.text();
});
