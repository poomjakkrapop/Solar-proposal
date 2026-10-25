import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadWorkspace,
  parseWorkspace,
  serializeWorkspace,
  nextId,
  customerStats,
  positiveNumber,
  toCsv,
  WORKSPACE_KEY,
} from "../lib/workspace.ts";

const customer = {
  id: "C-001",
  name: "ลูกค้าทดสอบ",
  contact: "ผู้ติดต่อ",
  phone: "",
  email: "",
  location: "กรุงเทพฯ",
  count: 0,
  value: 0,
};
const proposal = {
  id: "SP-2026-0148",
  customer: customer.name,
  contact: "ผู้ติดต่อ",
  location: "กรุงเทพฯ",
  system: 10,
  package: "Premium",
  amount: 389000,
  status: "ร่าง",
  created: "2026-10-21",
  updated: "2026-10-21",
};
const fixture = {
  proposals: [proposal],
  customers: [customer],
  company: { name: "Solar", address: "", phone: "", email: "", taxId: "" },
};

test("backup round-trip preserves records and links legacy proposals", () => {
  const result = parseWorkspace(serializeWorkspace(fixture));
  assert.equal(result.proposals[0].customerId, customer.id);
  assert.equal(result.proposals[0].amount, 389000);
  assert.equal(result.customers.length, 1);
});
test("legacy storage loads both arrays without writing or losing records", () => {
  const values = new Map([
    ["solardesk-demo-proposals:v1", JSON.stringify([proposal])],
    ["solardesk-demo-customers:v1", JSON.stringify([customer])],
  ]);
  const result = loadWorkspace(
    { getItem: (key) => values.get(key) ?? null },
    { ...fixture, proposals: [], customers: [] },
  );
  assert.equal(result.proposals.length, 1);
  assert.equal(result.customers.length, 1);
  assert.equal(values.has(WORKSPACE_KEY), false);
});
test("corrupt or future-version storage is rejected rather than reset", () => {
  assert.throws(() => loadWorkspace({ getItem: () => "broken json" }, fixture));
  assert.throws(() =>
    parseWorkspace(JSON.stringify({ schemaVersion: 99, data: fixture })),
  );
  assert.throws(() =>
    serializeWorkspace({
      ...fixture,
      proposals: [{ ...proposal, amount: NaN }],
    }),
  );
  assert.throws(() =>
    serializeWorkspace({ ...fixture, proposals: [proposal, proposal] }),
  );
});
test("proposal numbering increments the highest matching sequence", () => {
  assert.equal(
    nextId([proposal, { id: "SP-2025-9999" }], "SP-2026-"),
    "SP-2026-0149",
  );
  assert.equal(nextId([], "SP-2027-"), "SP-2027-0001");
});

test("document numbers cannot collide or contain path separators in backups", () => {
  assert.throws(() =>
    serializeWorkspace({
      ...fixture,
      proposals: [
        { ...proposal, documentNumber: "QT-256910-001" },
        { ...proposal, id: "SP-2026-0149", documentNumber: "QT-256910-001" },
      ],
    }),
  );
  assert.throws(() =>
    serializeWorkspace({
      ...fixture,
      proposals: [{ ...proposal, documentNumber: "../invalid" }],
    }),
  );
});
test("customer totals remain linked after a customer rename", () => {
  assert.deepEqual(
    customerStats({ ...customer, name: "ชื่อใหม่" }, [
      { ...proposal, customerId: customer.id },
    ]),
    { count: 1, value: 389000 },
  );
});
test("numeric validation rejects empty, negative, non-finite and non-numeric input", () => {
  for (const value of ["", " ", "-1", "0", "Infinity", "NaN", "abc"])
    assert.throws(() => positiveNumber(value, "ราคา"));
  assert.equal(positiveNumber("389000.50", "ราคา"), 389000.5);
});
test("CSV escapes quotes, newlines and spreadsheet formula payloads", () => {
  const csv = toCsv([
    { ...proposal, customer: '=HYPERLINK("https://example.com")\nลูกค้า' },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.com"")\nลูกค้า"'));
});
