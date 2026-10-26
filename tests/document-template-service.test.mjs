import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  documentTemplateRequest,
  MAX_DOCUMENT_TEMPLATE_BYTES,
} from "../lib/document-template-service.ts";

const actor = { id: "10000000-0000-4000-8000-000000000001", confirmed: true };
const bytes = Buffer.from("synthetic reviewed template bytes");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const catalog = [
  { id: "approval", filename: "approval.synthetic.docx", sha256 },
];
const row = () => ({
  id: "approval",
  sha256,
  content_base64: bytes.toString("base64"),
});
const request = (method = "GET") =>
  new Request("https://solar.example.invalid/api/document-templates/approval", {
    method,
  });
function operations(overrides = {}) {
  const calls = [];
  return {
    calls,
    value: {
      async identity() {
        calls.push("identity");
        return actor;
      },
      async membership(user) {
        calls.push("membership");
        assert.equal(user, actor);
        return { role: "owner", active: true };
      },
      async read(id) {
        calls.push("read");
        assert.equal(id, "approval");
        return row();
      },
      ...overrides,
    },
  };
}
const denied = (status) => (error) => {
  assert.equal(error.status, status);
  return true;
};

test("unknown template IDs and unsupported methods never invoke identity or provider operations", async () => {
  for (const id of [
    "unknown",
    "../approval",
    "approval.docx",
    "quotation?secret",
  ]) {
    const fixture = operations();
    await assert.rejects(
      documentTemplateRequest(request(), id, fixture.value, catalog),
      denied(404),
    );
    assert.deepEqual(fixture.calls, []);
  }
  const fixture = operations();
  await assert.rejects(
    documentTemplateRequest(
      request("POST"),
      "approval",
      fixture.value,
      catalog,
    ),
    denied(405),
  );
  assert.deepEqual(fixture.calls, []);
});

test("anonymous and unconfirmed identities are denied before membership or template reads", async () => {
  for (const [identity, status] of [
    [null, 401],
    [{ ...actor, confirmed: false }, 403],
    [{ ...actor, id: "untrusted-client-id" }, 401],
  ]) {
    const fixture = operations({
      async identity() {
        fixture.calls.push("identity");
        return identity;
      },
    });
    await assert.rejects(
      documentTemplateRequest(request(), "approval", fixture.value, catalog),
      denied(status),
    );
    assert.deepEqual(fixture.calls, ["identity"]);
  }
});

test("revoked, absent or non-Solar role membership cannot trigger a privileged template read", async () => {
  for (const membership of [
    undefined,
    { role: "viewer", active: false },
    { role: "ADMIN", active: true },
    { role: "owner", active: false },
  ]) {
    const fixture = operations({
      async membership() {
        fixture.calls.push("membership");
        return membership;
      },
    });
    await assert.rejects(
      documentTemplateRequest(request(), "approval", fixture.value, catalog),
      denied(403),
    );
    assert.deepEqual(fixture.calls, ["identity", "membership"]);
  }
});

test("each active Solar role receives only the exact reviewed bytes with private response headers", async () => {
  for (const role of ["owner", "editor", "viewer"]) {
    const fixture = operations({
      async membership() {
        fixture.calls.push("membership");
        return { role, active: true };
      },
    });
    const response = await documentTemplateRequest(
      request(),
      "approval",
      fixture.value,
      catalog,
    );
    assert.deepEqual(fixture.calls, ["identity", "membership", "read"]);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("pragma"), "no-cache");
    assert.equal(response.headers.get("vary"), "Cookie");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("content-length"), String(bytes.length));
    assert.match(
      response.headers.get("content-type"),
      /wordprocessingml.document/,
    );
    assert.equal(
      response.headers.get("content-disposition"),
      'attachment; filename="approval.synthetic.docx"',
    );
  }
});

test("wrong ID, declared hash, actual bytes or malformed base64 are rejected instead of returned", async () => {
  for (const invalid of [
    null,
    [],
    {},
    { ...row(), id: "quotation" },
    { ...row(), sha256: "0".repeat(64) },
    {
      ...row(),
      content_base64: Buffer.from("different bytes").toString("base64"),
    },
    { ...row(), content_base64: "%%%=" },
    { ...row(), content_base64: "" },
    { ...row(), content_base64: "AB==" },
    { ...row(), content_base64: "AA=A" },
    { ...row(), content_base64: "A===" },
  ]) {
    const fixture = operations({
      async read() {
        return invalid;
      },
    });
    await assert.rejects(
      documentTemplateRequest(request(), "approval", fixture.value, catalog),
      denied(503),
    );
  }
});

test("oversized encoded or decoded templates are refused even with an otherwise matching digest", async () => {
  const tooLarge = Buffer.alloc(MAX_DOCUMENT_TEMPLATE_BYTES + 1, 65);
  const largeHash = createHash("sha256").update(tooLarge).digest("hex");
  const fixture = operations({
    async read() {
      return {
        id: "approval",
        sha256: largeHash,
        content_base64: tooLarge.toString("base64"),
      };
    },
  });
  await assert.rejects(
    documentTemplateRequest(request(), "approval", fixture.value, [
      { ...catalog[0], sha256: largeHash },
    ]),
    denied(503),
  );
  const muchLarger = operations({
    async read() {
      return {
        ...row(),
        content_base64: "A".repeat(
          Math.ceil(MAX_DOCUMENT_TEMPLATE_BYTES / 3) * 4 + 4,
        ),
      };
    },
  });
  await assert.rejects(
    documentTemplateRequest(request(), "approval", muchLarger.value, catalog),
    denied(503),
  );
});

test("a canonical payload at the byte limit is hash-verified without a size-dependent regex failure", async () => {
  const maximum = Buffer.alloc(MAX_DOCUMENT_TEMPLATE_BYTES, 65);
  const expectedHash = createHash("sha256").update(maximum).digest("hex");
  const fixture = operations({
    async read() {
      return {
        id: "approval",
        sha256: expectedHash,
        content_base64: maximum.toString("base64"),
      };
    },
  });
  const response = await documentTemplateRequest(
    request(),
    "approval",
    fixture.value,
    [{ ...catalog[0], sha256: expectedHash }],
  );
  assert.equal(
    response.headers.get("content-length"),
    String(MAX_DOCUMENT_TEMPLATE_BYTES),
  );
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), maximum);
});

test("failed identity or membership lookups cannot fall back to a template read", async () => {
  for (const stage of ["identity", "membership"]) {
    const fixture = operations({
      async [stage]() {
        fixture.calls.push(stage);
        throw new Error("synthetic unavailable");
      },
    });
    await assert.rejects(
      documentTemplateRequest(request(), "approval", fixture.value, catalog),
      /synthetic unavailable/,
    );
    assert.ok(!fixture.calls.includes("read"));
  }
});
