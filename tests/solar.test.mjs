import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEstimate,
  bahtText,
  defaultSolarDetails,
  isSolarDetails,
  quotationPrefix,
} from "../lib/solar.ts";

test("Turnkey estimate matches both supplied forms to the satang", () => {
  const result = calculateEstimate({
    pricingMode: "turnkey",
    baseCost: 233000,
    operationsRate: 5,
    profitRate: 12.5,
    vatRate: 7,
  });
  assert.deepEqual(result, {
    baseCost: 233000,
    operations: 11650,
    profit: 30581.25,
    subtotal: 275231.25,
    vat: 19266.19,
    total: 294497.44,
  });
  assert.equal(
    bahtText(result.total),
    "สองแสนเก้าหมื่นสี่พันสี่ร้อยเก้าสิบเจ็ดบาทสี่สิบสี่สตางค์",
  );
});
test("fixed gross amount remains unchanged when splitting out VAT", () => {
  const result = calculateEstimate(defaultSolarDetails(), 294497.44);
  assert.equal(result.subtotal, 275231.25);
  assert.equal(result.vat, 19266.19);
  assert.equal(result.total, 294497.44);
});
test("VAT and subtotals reconcile for small and fractional values", () => {
  for (const total of [0, 0.01, 1.01, 19.99, 1000000.01]) {
    const result = calculateEstimate(defaultSolarDetails(), total);
    assert.equal(
      Math.round((result.subtotal + result.vat) * 100),
      Math.round(total * 100),
    );
  }
});
test("Thai currency text handles unit, tens, satang and million groups", () => {
  for (const [number, text] of [
    [0, "ศูนย์บาทถ้วน"],
    [1, "หนึ่งบาทถ้วน"],
    [11, "สิบเอ็ดบาทถ้วน"],
    [21, "ยี่สิบเอ็ดบาทถ้วน"],
    [101, "หนึ่งร้อยเอ็ดบาทถ้วน"],
    [1000001, "หนึ่งล้านเอ็ดบาทถ้วน"],
    [1.01, "หนึ่งบาทหนึ่งสตางค์"],
  ])
    assert.equal(bahtText(number), text);
});
test("invalid rates, negative costs, malformed dates and phases are rejected", () => {
  assert.throws(() =>
    calculateEstimate({ ...defaultSolarDetails(), vatRate: 101 }, 100),
  );
  assert.throws(() =>
    calculateEstimate({ ...defaultSolarDetails(), baseCost: -1 }, 100),
  );
  assert.equal(
    isSolarDetails({ ...defaultSolarDetails(), issueDate: "2026-02-31" }),
    false,
  );
  assert.equal(isSolarDetails({ ...defaultSolarDetails(), phase: "1" }), false);
});
test("quotation number uses Buddhist year and two-digit month", () => {
  assert.equal(quotationPrefix("2026-10-15"), "QT-256910-");
});

test("equipment quantities are integral, date ranges are bounded and large costs are supported", () => {
  assert.equal(
    isSolarDetails({ ...defaultSolarDetails(), panelCount: 2.5 }),
    false,
  );
  assert.equal(
    isSolarDetails({ ...defaultSolarDetails(), validDays: 366 }),
    false,
  );
  assert.equal(
    isSolarDetails({ ...defaultSolarDetails(), baseCost: 2e9 }),
    true,
  );
  const legacy = defaultSolarDetails();
  delete legacy.templateQuantity4;
  delete legacy.templateQuantity5;
  assert.equal(isSolarDetails(legacy), true);
});
