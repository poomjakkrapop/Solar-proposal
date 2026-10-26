import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadTemplates,
  retainVerifiedTemplate,
  attachTemplate,
} from "../lib/template-store.ts";
import { digestFile } from "../lib/private-files.ts";
import { downloadBlob } from "../lib/file-download.ts";

const file = () => ({
  id: "quotation",
  filename: "synthetic.docx",
  buffer: new TextEncoder().encode("synthetic template data").buffer,
  attachedAt: "2026-10-25T00:00:00Z",
});
test("one unreadable cached template does not hide the other valid template or a cache miss", async () => {
  const valid = file();
  const result = await loadTemplates(["approval", "quotation"], (id) => {
    if (id === "approval") throw new Error("synthetic cache failure");
    return Promise.resolve(valid);
  });
  assert.equal(result.files.quotation, valid);
  assert.equal(result.errors.approval, "synthetic cache failure");
  assert.equal(result.errors.quotation, undefined);
  const empty = await loadTemplates(
    ["approval", "quotation"],
    async () => undefined,
  );
  assert.deepEqual(empty, { files: {}, errors: {} });
});
test("a verified template remains usable in tab memory after private storage fails", async () => {
  const selected = file();
  const hash = await digestFile(selected.buffer);
  const result = await retainVerifiedTemplate(selected, hash, async () => {
    throw new Error("synthetic quota denied");
  });
  assert.equal(result.sessionOnly, true);
  assert.equal(result.buffer, selected.buffer);
  assert.equal(result.filename, selected.filename);
  const saved = await retainVerifiedTemplate(
    selected,
    hash,
    async () => selected,
  );
  assert.equal(saved, selected);
  assert.equal(saved.sessionOnly, undefined);
});
test("storage fallback cannot make an unverified or wrong original downloadable", async () => {
  let writes = 0;
  const persist = async () => {
    writes++;
    throw new Error("storage unavailable");
  };
  await assert.rejects(
    retainVerifiedTemplate(file(), "0".repeat(64), persist),
    /ไม่ตรง/,
  );
  await assert.rejects(
    attachTemplate(
      "approval",
      new File(["synthetic data"], "wrong.docx"),
      persist,
    ),
    /ไม่ตรง/,
  );
  await assert.rejects(
    attachTemplate(
      "approval",
      new File(["synthetic data"], "wrong.docm"),
      persist,
    ),
    /DOCX/,
  );
  assert.equal(writes, 0);
});
function environment(fail = false) {
  const links = [],
    revoked = [],
    timers = [];
  return {
    links,
    revoked,
    timers,
    value: {
      createLink() {
        const link = {
          href: "",
          download: "",
          hidden: false,
          connected: false,
          click() {
            assert.equal(this.connected, true);
            if (fail) throw new Error("synthetic browser blocked");
            this.clicked = true;
          },
          remove() {
            this.connected = false;
            this.removed = true;
          },
        };
        links.push(link);
        return link;
      },
      appendLink(link) {
        link.connected = true;
      },
      createUrl() {
        return `blob:synthetic-${links.length + 1}`;
      },
      revokeUrl(url) {
        revoked.push(url);
      },
      later(callback, delay) {
        timers.push({ callback, delay });
      },
    },
  };
}
test("Word download and retry use connected anchors and keep independent URLs alive through prompts", () => {
  const env = environment();
  const blob = new Blob(["synthetic Word bytes"]);
  downloadBlob(blob, "QT-test.docx", env.value);
  downloadBlob(blob, "QT-test.docx", env.value);
  assert.equal(env.links.length, 2);
  assert.ok(
    env.links.every(
      (link) =>
        link.clicked && link.removed && link.download === "QT-test.docx",
    ),
  );
  assert.notEqual(env.links[0].href, env.links[1].href);
  assert.deepEqual(env.revoked, []);
  assert.ok(env.timers.every((timer) => timer.delay >= 60000));
  env.timers.forEach((timer) => timer.callback());
  assert.deepEqual(env.revoked, ["blob:synthetic-1", "blob:synthetic-2"]);
});
test("a failed browser download cleans up its anchor and URL without reporting success", () => {
  const env = environment(true);
  assert.throws(
    () => downloadBlob(new Blob(["synthetic"]), "test.docx", env.value),
    /blocked/,
  );
  assert.equal(env.links[0].removed, true);
  assert.deepEqual(env.revoked, ["blob:synthetic-1"]);
  assert.deepEqual(env.timers, []);
});
