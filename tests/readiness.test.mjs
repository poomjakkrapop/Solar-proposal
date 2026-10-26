import { test } from "node:test";
import assert from "node:assert/strict";
import { assertUnchanged } from "../lib/edit-conflict.ts";
import { stagePreview } from "../lib/preview-task.ts";
import { digestFile, verifyPrivateFile } from "../lib/private-files.ts";
import { withWorkspaceLock } from "../lib/workspace-lock.ts";

test("workspace writes run only after an exclusive lock and keep it through completion", async () => {
  let grant;
  let done = false;
  let wrote = false;
  const locks = {
    request(name, options, write) {
      assert.equal(name, "workspace:write");
      assert.equal(options.mode, "exclusive");
      assert.equal(options.signal.aborted, false);
      return new Promise((resolve, reject) => {
        grant = async () => {
          try {
            resolve(await write());
          } catch (error) {
            reject(error);
          }
        };
      });
    },
  };
  let finish;
  const writing = withWorkspaceLock(locks, "workspace:write", async () => {
    wrote = true;
    await new Promise((resolve) => {
      finish = resolve;
    });
    return "saved";
  }).then((result) => {
    done = true;
    return result;
  });
  assert.equal(wrote, false);
  const granted = grant();
  assert.equal(wrote, true);
  assert.equal(done, false);
  finish();
  await granted;
  assert.equal(await writing, "saved");
});

test("missing or timed-out locks never run an unsafe fallback write", async () => {
  let wrote = false;
  const write = () => {
    wrote = true;
  };
  await assert.rejects(
    withWorkspaceLock(undefined, "workspace", write),
    /ไม่รองรับ/,
  );
  await assert.rejects(
    withWorkspaceLock(
      {
        request: async () => {
          throw new DOMException("timeout", "TimeoutError");
        },
      },
      "workspace",
      write,
    ),
    /อีกแท็บ/,
  );
  assert.equal(wrote, false);
});

test("stale editors reject another tab's change or a deleted record without overwriting it", () => {
  const baseline = { id: "SP-1", amount: 100, status: "ร่าง" };
  const current = { ...baseline, amount: 200 };
  assert.throws(
    () => assertUnchanged(current, baseline, "ใบเสนอราคา"),
    /เปลี่ยนหลังจากเปิดฟอร์ม/,
  );
  assert.equal(current.amount, 200);
  assert.throws(() => assertUnchanged(undefined, baseline, "ใบเสนอราคา"));
});
test("semantically identical snapshots do not conflict because JSON keys were reordered", () => {
  assert.doesNotThrow(() =>
    assertUnchanged(
      { amount: 100, nested: { b: 2, a: 1 } },
      { nested: { a: 1, b: 2 }, amount: 100 },
      "รายการ",
    ),
  );
});
test("a proposal edit can preserve newer procurement without reverting a changed sales status", () => {
  const baseline = {
    id: "SP-1",
    status: "ร่าง",
    updated: "old",
    procurement: { contractor: "" },
  };
  const current = {
    ...baseline,
    updated: "new",
    procurement: { contractor: "ผู้รับจ้างจำลอง" },
  };
  assert.doesNotThrow(() =>
    assertUnchanged(current, baseline, "ใบเสนอราคา", [
      "procurement",
      "updated",
    ]),
  );
  assert.throws(() =>
    assertUnchanged({ ...current, status: "ส่งแล้ว" }, baseline, "ใบเสนอราคา", [
      "procurement",
      "updated",
    ]),
  );
});
test("import confirmation must compare the whole workspace from file-selection time", () => {
  const baseline = { proposals: [{ id: "SP-1" }], company: { name: "เดิม" } };
  const current = {
    ...baseline,
    proposals: [...baseline.proposals, { id: "SP-2" }],
  };
  assert.throws(() =>
    assertUnchanged(current, baseline, "พื้นที่ทำงานก่อนนำเข้า"),
  );
  assert.equal(current.proposals.length, 2);
});
test("company edits may preserve newer official fields but cannot overwrite another company-name edit", () => {
  const baseline = { name: "Solar", official: { branch: "เก่า" } };
  assert.doesNotThrow(() =>
    assertUnchanged(
      { ...baseline, official: { branch: "ใหม่" } },
      baseline,
      "บริษัท",
      ["official"],
    ),
  );
  assert.throws(() =>
    assertUnchanged({ ...baseline, name: "อีกแท็บ" }, baseline, "บริษัท", [
      "official",
    ]),
  );
});
test("an older asynchronous Word render cannot publish after a newer preview", async () => {
  let resolveOld;
  let oldActive = true;
  const published = [];
  const old = stagePreview(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    () => oldActive,
    (value) => published.push(value),
  );
  oldActive = false;
  await stagePreview(
    async () => "new document",
    () => true,
    (value) => published.push(value),
  );
  resolveOld("old document");
  await old;
  assert.deepEqual(published, ["new document"]);
});
test("a failed Word render never publishes partial content", async () => {
  let published = false;
  await assert.rejects(
    stagePreview(
      async () => {
        throw new Error("bad document");
      },
      () => true,
      () => {
        published = true;
      },
    ),
  );
  assert.equal(published, false);
});
test("cached private templates must still match the exact hash before preview", async () => {
  const buffer = new TextEncoder().encode("reviewed reference").buffer;
  const file = {
    id: "reference",
    filename: "test.docx",
    attachedAt: "2026-10-25T00:00:00Z",
    buffer,
  };
  const expected = await digestFile(buffer);
  await assert.doesNotReject(verifyPrivateFile(file, "reference", expected));
  await assert.rejects(
    verifyPrivateFile(
      { ...file, buffer: new ArrayBuffer(2) },
      "reference",
      expected,
    ),
    /ไม่ตรง/,
  );
  await assert.rejects(verifyPrivateFile(file, "other", expected), /เสียหาย/);
  await assert.rejects(
    verifyPrivateFile(
      { ...file, attachedAt: "invalid" },
      "reference",
      expected,
    ),
  );
  assert.equal(file.buffer, buffer);
});
