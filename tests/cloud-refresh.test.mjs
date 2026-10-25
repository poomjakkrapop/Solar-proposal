import { test } from "node:test";
import assert from "node:assert/strict";
import { readCloudWorkspace } from "../lib/cloud-refresh.ts";

const id = "10000000-0000-4000-8000-000000000001";
const document = {
  company: { name: "Synthetic QA", address: "", phone: "", email: "", taxId: "" },
  customers: [],
  proposals: [],
};
const response = (role, workspaceId = id) =>
  Response.json({ current: { id: workspaceId, role, revision: 2, document } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test("a late editor response cannot undo a newer viewer role at the same document revision", async () => {
  let latest = 0;
  const observed = [];
  const load = async (fetcher) => {
    const ticket = ++latest;
    const next = await readCloudWorkspace(id, () => ticket === latest, undefined, fetcher);
    if (next) observed.push({ role: next.role, revision: next.revision });
  };
  const slow = deferred();
  const old = load(() => slow.promise);
  await load(async () => response("viewer"));
  slow.resolve(response("editor"));
  await old;
  assert.deepEqual(observed, [{ role: "viewer", revision: 2 }]);
});

test("a read invalidated by a save cannot publish a late snapshot or network failure", async () => {
  let active = true;
  const slow = deferred();
  const old = readCloudWorkspace(id, () => active, undefined, () => slow.promise);
  active = false;
  slow.resolve(response("owner"));
  assert.equal(await old, null);

  active = true;
  const failed = deferred();
  const oldFailure = readCloudWorkspace(id, () => active, undefined, () => failed.promise);
  active = false;
  failed.reject(new Error("synthetic disconnected request"));
  assert.equal(await oldFailure, null);
});

test("latest revoked access is reported while obsolete denials and cancelled reads are ignored", async () => {
  await assert.rejects(
    readCloudWorkspace(id, () => true, undefined, async () => new Response(null, { status: 403 })),
    { status: 403 },
  );
  assert.equal(
    await readCloudWorkspace(id, () => false, undefined, async () => new Response(null, { status: 403 })),
    null,
  );
  const controller = new AbortController();
  controller.abort();
  assert.equal(
    await readCloudWorkspace(id, () => true, controller.signal, async () => response("owner")),
    null,
  );
});

test("a successful response from a different workspace is never adopted", async () => {
  await assert.rejects(
    readCloudWorkspace(id, () => true, undefined, async () => response("owner", "10000000-0000-4000-8000-000000000002")),
    /ไม่ตรงกัน/,
  );
});
