import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBuiltinTemplateLoader,
  isReviewedTemplateHash,
} from "../lib/builtin-templates.ts";
import { builtinTemplateCatalog } from "../lib/builtin-template-catalog.ts";
import { digestFile } from "../lib/private-files.ts";
import { getTemplate } from "../lib/template-store.ts";
import {
  getProcurementReference,
  loadProcurementReferences,
} from "../lib/procurement-references.ts";
import { generateMappedDocx } from "../lib/template-engine.ts";

const firstBytes = new TextEncoder().encode(
  "synthetic reviewed blank template",
);
const secondBytes = new TextEncoder().encode(
  "another synthetic blank template",
);
const catalog = [
  {
    id: "approval",
    key: "approval",
    filename: "approval.synthetic.docx",
    sha256: await digestFile(firstBytes.buffer),
    sourceSha256: "a".repeat(64),
  },
  {
    id: "quotation",
    key: "quotation",
    filename: "quotation.synthetic.docx",
    sha256: await digestFile(secondBytes.buffer),
    sourceSha256: "b".repeat(64),
  },
];
const response = (bytes) => new Response(bytes.slice());

test("built-in template requests deduplicate verification but never expose a mutable shared source buffer", async () => {
  let requests = 0;
  const load = createBuiltinTemplateLoader(catalog, async (url) => {
    requests++;
    assert.equal(url, "/api/document-templates/approval");
    return response(firstBytes);
  });
  const [one, two] = await Promise.all([load("approval"), load("approval")]);
  assert.equal(requests, 1);
  assert.notEqual(one.buffer, two.buffer);
  assert.equal(one.source, "builtin");
  assert.equal(one.version, catalog[0].sha256);
  new Uint8Array(one.buffer)[0] ^= 255;
  const later = await load("approval");
  assert.equal(await digestFile(later.buffer), catalog[0].sha256);
  assert.equal(await digestFile(two.buffer), catalog[0].sha256);
  assert.equal(requests, 1);
});

test("a failed private template request can retry without clearing site data and never uses a shared browser cache", async () => {
  const cacheModes = [];
  const load = createBuiltinTemplateLoader(catalog, async (_url, options) => {
    cacheModes.push({ cache: options.cache, credentials: options.credentials });
    return cacheModes.length === 1
      ? new Response("unavailable", { status: 503 })
      : response(firstBytes);
  });
  await assert.rejects(load("approval"), /โหลดต้นแบบ/);
  const valid = await load("approval");
  assert.equal(await digestFile(valid.buffer), catalog[0].sha256);
  assert.deepEqual(cacheModes, [
    { cache: "no-store", credentials: "same-origin" },
    { cache: "no-store", credentials: "same-origin" },
  ]);
});

test("private template 401 asks for sign-in, 403 explains permission, and successful authorization can retry", async () => {
  for (const [status, expected] of [
    [401, /เข้าสู่ระบบ/],
    [403, /สิทธิ์/],
  ]) {
    let requests = 0;
    const load = createBuiltinTemplateLoader(catalog, async (_url, options) => {
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.cache, "no-store");
      return ++requests === 1
        ? new Response("denied", { status })
        : response(firstBytes);
    });
    await assert.rejects(load("approval"), (error) => {
      assert.match(error.message, expected);
      assert.ok(!error.message.includes("แนบต้นฉบับ"));
      return true;
    });
    const authorized = await load("approval");
    assert.equal(authorized.version, catalog[0].sha256);
    assert.equal(requests, 2);
  }
});

test("procurement keeps controlled access reasons actionable without leaking arbitrary provider errors or hiding other forms", async () => {
  const signIn = "กรุณาเข้าสู่ระบบ SolarDesk เพื่อใช้ต้นแบบส่วนตัว";
  const forbidden = "บัญชีนี้ยังไม่มีสิทธิ์ใช้ต้นแบบของ SolarDesk";
  const valid = {
    id: "procurement:acceptance",
    filename: "synthetic.docx",
    format: "docx",
    buffer: new ArrayBuffer(1),
    attachedAt: "2026-10-26T00:00:00Z",
  };
  const result = await loadProcurementReferences(async (id) => {
    if (id === "invitation") throw Error(signIn);
    if (id === "service-approval") throw Error(forbidden);
    if (id === "service-contract")
      throw Error(`${signIn} synthetic-private-provider-detail`);
    return id === "acceptance" ? valid : undefined;
  });
  assert.equal(result.errors.length, 3);
  assert.ok(result.errors.some((message) => message.endsWith(signIn)));
  assert.ok(result.errors.some((message) => message.endsWith(forbidden)));
  assert.ok(
    result.errors.some((message) =>
      message.endsWith("โหลดต้นแบบของระบบไม่สำเร็จ กรุณาลองใหม่"),
    ),
  );
  assert.ok(
    result.errors.every(
      (message) => !message.includes("synthetic-private-provider-detail"),
    ),
  );
  assert.equal(result.files.acceptance, valid);
});

test("a corrupted download is rejected without hiding another built-in template or preventing a corrected retry", async () => {
  let approvalRequests = 0;
  const load = createBuiltinTemplateLoader(catalog, async (url) => {
    if (url.includes("quotation")) return response(secondBytes);
    approvalRequests++;
    return response(approvalRequests === 1 ? secondBytes : firstBytes);
  });
  const results = await Promise.allSettled([
    load("approval"),
    load("quotation"),
  ]);
  assert.equal(results[0].status, "rejected");
  assert.match(results[0].reason.message, /ตรวจสอบต้นแบบ/);
  assert.equal(results[1].status, "fulfilled");
  assert.equal((await load("approval")).version, catalog[0].sha256);
});

test("unknown template keys, unsafe manifest paths, empty assets and oversized responses fail closed", async () => {
  let requests = 0;
  const load = createBuiltinTemplateLoader(catalog, async () => {
    requests++;
    return response(firstBytes);
  });
  await assert.rejects(load("unknown"), /ไม่พบต้นแบบ/);
  const unsafe = createBuiltinTemplateLoader(
    [{ ...catalog[0], filename: "../private.docx" }],
    async () => {
      requests++;
      return response(firstBytes);
    },
  );
  await assert.rejects(unsafe("approval"), /ไม่พบต้นแบบ/);
  assert.equal(requests, 0);
  const empty = createBuiltinTemplateLoader(
    catalog,
    async () => new Response(new Uint8Array()),
  );
  await assert.rejects(empty("approval"), /ข้อมูลต้นแบบ/);
  const large = createBuiltinTemplateLoader(
    catalog,
    async () =>
      new Response(firstBytes, {
        headers: { "content-length": String(10 * 1024 * 1024 + 1) },
      }),
  );
  await assert.rejects(large("approval"), /ขนาดต้นแบบ/);
});

test("a built-in digest is accepted only for the original source map it was reviewed against", async () => {
  assert.ok(builtinTemplateCatalog.length >= 2);
  for (const entry of builtinTemplateCatalog) {
    assert.equal(
      isReviewedTemplateHash(entry.sourceSha256, entry.sha256),
      true,
    );
    assert.equal(
      isReviewedTemplateHash(entry.sourceSha256, entry.sourceSha256),
      true,
    );
    const other = builtinTemplateCatalog.find(
      (item) => item.sourceSha256 !== entry.sourceSha256,
    );
    assert.equal(
      isReviewedTemplateHash(other.sourceSha256, entry.sha256),
      false,
    );
  }
  await assert.rejects(
    generateMappedDocx(
      firstBytes.buffer,
      { sha256: builtinTemplateCatalog[0].sourceSha256, slots: [] },
      {},
    ),
    /ไฟล์ต้นแบบไม่ตรง/,
  );
});

test("default Solar and procurement requests use registered authenticated endpoints without reading private IndexedDB even when the provider fails", async () => {
  const previousFetch = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  let privateReads = 0;
  const requests = [];
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    get() {
      privateReads++;
      throw Error("synthetic corrupt private cache");
    },
  });
  globalThis.fetch = async (url, options) => {
    const entry = builtinTemplateCatalog.find(
      (item) => url === `/api/document-templates/${item.id}`,
    );
    assert.ok(entry, "fetch must use a registered private template endpoint");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    requests.push(url);
    return new Response("synthetic private provider unavailable", {
      status: 503,
    });
  };
  try {
    await assert.rejects(getTemplate("approval"), /โหลดต้นแบบ/);
    await assert.rejects(getProcurementReference("supervision"), /โหลดต้นแบบ/);
    assert.deepEqual(requests, [
      "/api/document-templates/approval",
      "/api/document-templates/supervision",
    ]);
    assert.equal(privateReads, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (descriptor) Object.defineProperty(globalThis, "indexedDB", descriptor);
    else delete globalThis.indexedDB;
  }
});
