import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeCustomers } from "../lib/customer-summaries.ts";
import { customerStats } from "../lib/workspace.ts";

const customer = (id, name) => ({
  id,
  name,
  contact: "ผู้ติดต่อทดสอบ",
  phone: "",
  email: "",
  location: "พื้นที่ทดสอบ",
  count: 99,
  value: 999,
});
const proposal = (id, name, amount, customerId) => ({
  id,
  customer: name,
  customerId,
  amount,
  contact: "ผู้ติดต่อทดสอบ",
  location: "พื้นที่ทดสอบ",
  system: 1,
  package: "QA",
  status: "ร่าง",
  created: "2026-10-26",
  updated: "2026-10-26",
});
const original = (customers, proposals) =>
  customers.map((entry) => ({ ...entry, ...customerStats(entry, proposals) }));

test("customer summary index preserves ID precedence, renamed records and legacy name matching", () => {
  const customers = [
    customer("C-1", "Alpha Renamed"),
    customer("C-2", "Beta"),
    customer("C-3", "  ALPHA RENAMED  "),
    customer("C-4", "Unused"),
  ];
  const proposals = [
    proposal("P-1", "Old name", 10, "C-1"),
    proposal("P-2", "  alpha renamed ", 20),
    proposal("P-3", "Beta", 30, "missing-id"),
    proposal("P-4", "  BETA  ", 40, ""),
    proposal("P-5", "Alpha Renamed", 50, "C-2"),
  ];
  assert.deepEqual(summarizeCustomers(customers, proposals), original(customers, proposals));
  assert.deepEqual(
    summarizeCustomers(customers, proposals).map(({ count, value }) => ({ count, value })),
    [
      { count: 2, value: 30 },
      { count: 2, value: 90 },
      { count: 1, value: 20 },
      { count: 0, value: 0 },
    ],
  );
});

test("indexed totals preserve the original addition order across ID and legacy matches", () => {
  const customers = [customer("C-1", "Alpha")];
  const proposals = [
    proposal("P-1", "Old name", 0.1, "C-1"),
    proposal("P-2", "Alpha", 0.2),
    proposal("P-3", "Old name", 0.4, "C-1"),
  ];
  const result = summarizeCustomers(customers, proposals);
  assert.deepEqual(result, original(customers, proposals));
  assert.equal(result[0].value, 0.7000000000000001);
});

test("customer summaries do not mutate records or retain stale cached totals", () => {
  const customers = Object.freeze([Object.freeze(customer("C-1", "Alpha"))]);
  const proposals = Object.freeze([Object.freeze(proposal("P-1", "Alpha", 25))]);
  assert.deepEqual(summarizeCustomers(customers, proposals), original(customers, proposals));
  const empty = summarizeCustomers(customers, []);
  assert.notEqual(empty, customers);
  assert.notEqual(empty[0], customers[0]);
  assert.deepEqual({ count: empty[0].count, value: empty[0].value }, { count: 0, value: 0 });
  assert.equal(customers[0].count, 99);
  assert.equal(customers[0].value, 999);
  assert.deepEqual(summarizeCustomers([], proposals), []);
});
