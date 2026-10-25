import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDocumentValues,
  documentReadiness,
} from "../lib/document-data.ts";
import { defaultSolarDetails, defaultOfficialProfile } from "../lib/solar.ts";
import { templateMaps } from "../lib/template-maps.ts";
const solar = {
  ...defaultSolarDetails(13),
  issueDate: "2026-10-15",
  pricingMode: "turnkey",
  baseCost: 233000,
  panelBrand: "PV Example",
  panelCount: 20,
  inverterBrand: "Example",
  inverterModel: "MODEL-13",
  inverterKw: 13,
  letterReference: "TEST-001",
};
const proposal = {
  id: "SP-2026-0001",
  documentNumber: "QT-256910-001",
  customer: "ลูกค้าทดสอบ",
  location: "ที่อยู่ทดสอบ",
  contact: "ผู้ติดต่อ",
  system: 13,
  amount: 294497.44,
  package: "Premium",
  status: "ร่าง",
  created: "2026-10-15",
  updated: "2026-10-15",
  solar,
};
const company = {
  name: "บริษัทตัวอย่าง",
  phone: "",
  email: "",
  address: "",
  taxId: "",
  official: {
    ...defaultOfficialProfile,
    branchName: "หน่วยงานตัวอย่าง",
    department: "แผนกตัวอย่าง",
    preparerName: "ผู้จัดทำตัวอย่าง",
    preparerRole: "เจ้าหน้าที่",
    managerRole: "ผู้จัดการ",
    reviewerRole: "หัวหน้าแผนก",
    addressLine1: "ที่อยู่ 1",
    addressLine2: "ที่อยู่ 2",
  },
};
test("every document slot has a computed value and totals match", () => {
  const values = buildDocumentValues(proposal, company);
  for (const map of templateMaps)
    for (const slot of map.slots)
      assert.equal(typeof values[slot.key], "string", slot.key);
  assert.equal(values.total, "294,497.44");
  assert.equal(values.dateLong, "15 ตุลาคม 2569");
  assert.equal(documentReadiness(proposal, company, "approval").length, 0);
  assert.equal(documentReadiness(proposal, company, "quotation").length, 0);
});
test("missing metadata and incompatible fixed pricing block approval output", () => {
  assert.ok(
    documentReadiness({ ...proposal, solar: undefined }, company, "approval")
      .length,
  );
  assert.ok(
    documentReadiness(
      { ...proposal, solar: { ...solar, pricingMode: "fixed" } },
      company,
      "approval",
    ).some((item) => item.includes("Turnkey")),
  );
});

test("approval memo requires adequate signatory authority", () => {
  const missing = documentReadiness(
    proposal,
    { ...company, official: { ...company.official, approvalLimit: 100000 } },
    "approval",
  );
  assert.ok(missing.some((item) => item.includes("วงเงิน")));
});
test("payment text includes banking instructions only when configured", () => {
  const empty = buildDocumentValues(proposal, company);
  assert.ok(!empty.paymentInstruction.includes("เลขที่บัญชี"));
  const configured = buildDocumentValues(proposal, {
    ...company,
    official: {
      ...company.official,
      bankName: "ธนาคารตัวอย่าง",
      bankAccountNumber: "000-0000000",
      bankAccountName: "บัญชีทดสอบ",
    },
  });
  assert.ok(configured.paymentInstruction.includes("000-0000000"));
});

test("manually reviewed quantity columns do not silently follow optimizer or panel counts", () => {
  const values = buildDocumentValues(
    {
      ...proposal,
      solar: {
        ...solar,
        templateQuantity4: 7,
        templateQuantity5: 9,
        optimizerCount: 20,
        panelCount: 30,
      },
    },
    company,
  );
  assert.equal(values.templateQuantity4, "7");
  assert.equal(values.templateQuantity5, "9");
});
