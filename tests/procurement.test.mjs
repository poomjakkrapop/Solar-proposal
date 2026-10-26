import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultProcurement,
  defaultProcurementDocument,
  isProcurement,
  procurementDocumentIds,
  procurementTotals,
  procurementWarnings,
} from "../lib/procurement.ts";
import {
  procurementReferences,
  procurementStages,
} from "../lib/procurement-catalog.ts";
import { parseWorkspace, serializeWorkspace } from "../lib/workspace.ts";

test("the 11 references belong to a known workflow stage and have unique verified hashes", () => {
  assert.equal(procurementReferences.length, 11);
  assert.deepEqual(
    new Set(procurementReferences.map((item) => item.id)),
    new Set(procurementDocumentIds),
  );
  assert.equal(
    new Set(procurementReferences.map((item) => item.sha256)).size,
    11,
  );
  for (const item of procurementReferences) {
    assert.match(item.sha256, /^[0-9a-f]{64}$/);
    assert.ok(procurementStages.some((stage) => stage.id === item.stage));
  }
  assert.equal(
    procurementReferences.filter((item) => item.previewable).length,
    11,
  );
  assert.equal(
    procurementReferences.find((item) => item.id === "supervision").previewable,
    true,
  );
});
test("new procurement is empty and has no inherited parties, prices, dates or approvals", () => {
  const data = defaultProcurement();
  assert.equal(isProcurement(data), true);
  assert.equal(data.contractorName, "");
  assert.equal(data.agreedGross, 0);
  assert.equal(data.vatRate, 0);
  assert.equal(data.startDate, "");
  assert.deepEqual(data.documents, {});
});
test("procurement validation rejects impossible dates, negative amounts, fractional days and unknown document states", () => {
  for (const changes of [
    { dueDate: "2026-02-31" },
    { dueDate: "2569-10-21" },
    { startDate: "0006-02-20" },
    { startDate: "2026-10-22", dueDate: "2026-10-21" },
    { vatRate: 101 },
    { agreedGross: -1 },
    { deliveryDays: 1.5 },
    { documents: { unknown: defaultProcurementDocument } },
    {
      documents: {
        invitation: { ...defaultProcurementDocument, state: "ลงนามแล้ว" },
      },
    },
  ])
    assert.equal(isProcurement({ ...defaultProcurement(), ...changes }), false);
});
test("procurement VAT calculation reconciles independently of customer sales price", () => {
  const totals = procurementTotals(267500, 7);
  assert.equal(totals.subtotal, 250000);
  assert.equal(totals.vat, 17500);
  assert.equal(totals.total, 267500);
});
test("budget warnings are not a legal approval or automatic selection of contract type", () => {
  const warnings = procurementWarnings({
    ...defaultProcurement(),
    budgetGross: 100,
    agreedGross: 110,
    offeredGross: 100,
  });
  assert.ok(warnings.some((item) => item.includes("วงเงิน")));
  assert.ok(warnings.some((item) => item.includes("ตัดสินอัตโนมัติ")));
});
test("backup preserves procurement without changing customer/contractor roles or legacy records", () => {
  const procurement = {
    ...defaultProcurement(),
    contractorName: "ผู้รับจ้างทดสอบ",
    agreedGross: 267500,
    vatRate: 7,
    documents: {
      invitation: {
        ...defaultProcurementDocument,
        reference: "REF-001",
        state: "รอตรวจทาน",
      },
    },
  };
  const proposal = {
    id: "SP-1",
    customer: "ลูกค้าทดสอบ",
    contact: "ผู้ติดต่อ",
    location: "พื้นที่ทดสอบ",
    system: 10,
    package: "Premium",
    amount: 315984.38,
    status: "ร่าง",
    created: "2026-10-21",
    updated: "2026-10-21",
  };
  const data = {
    proposals: [
      { ...proposal, procurement },
      { ...proposal, id: "SP-2" },
    ],
    customers: [],
    company: { name: "ทดสอบ", address: "", phone: "", email: "", taxId: "" },
  };
  const next = parseWorkspace(serializeWorkspace(data));
  assert.deepEqual(next.proposals[0].procurement, procurement);
  assert.equal(next.proposals[0].customer, "ลูกค้าทดสอบ");
  assert.equal(next.proposals[0].amount, 315984.38);
  assert.equal(next.proposals[1].procurement, undefined);
});
