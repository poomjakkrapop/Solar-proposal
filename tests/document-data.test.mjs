import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDocumentValues,
  documentReadiness,
} from "../lib/document-data.ts";
import { defaultSolarDetails, defaultOfficialProfile } from "../lib/solar.ts";
import { templateMaps } from "../lib/template-maps.ts";
import {
  draftValueErrors,
  prepareSolarDraft,
  safeDraftFilename,
  solarDraftFields,
} from "../lib/document-draft.ts";
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

test("a saved price differing from the computed estimate blocks both Solar forms without rewriting the record", () => {
  const imported = structuredClone({ ...proposal, amount: 100 });
  const before = JSON.stringify(imported);
  for (const id of ["approval", "quotation"]) {
    assert.ok(
      documentReadiness(imported, company, id).some((message) =>
        message.includes("ยอดขายที่บันทึก"),
      ),
    );
    assert.deepEqual(prepareSolarDraft(imported, company, id).values, {});
  }
  assert.equal(JSON.stringify(imported), before);
});
test("whitespace cannot satisfy required quotation fields or enable optional banking instructions", () => {
  const missing = documentReadiness(
    {
      ...proposal,
      solar: {
        ...solar,
        letterReference: " ",
        panelBrand: "\t",
        inverterBrand: " ",
        inverterModel: " ",
      },
    },
    {
      ...company,
      official: { ...company.official, addressLine1: " ", addressLine2: " " },
    },
    "quotation",
  );
  assert.equal(missing.length, 4);
  const values = buildDocumentValues(proposal, {
    ...company,
    official: {
      ...company.official,
      bankAccountNumber: " ",
      bankName: " ",
      chequePayee: " ",
    },
  });
  assert.ok(!values.paymentInstruction.includes("เลขที่บัญชี"));
  assert.ok(!values.paymentInstruction.includes("เช็คขีดคร่อม"));
});
test("large or malformed estimates fail closed before a review editor can throw during rendering", () => {
  for (const changes of [
    { baseCost: 1e12, operationsRate: 100, profitRate: 100, vatRate: 100 },
    { baseCost: -1 },
  ]) {
    const result = prepareSolarDraft(
      { ...proposal, solar: { ...solar, ...changes } },
      company,
      "approval",
    );
    assert.ok(result.missing.length);
    assert.deepEqual(result.values, {});
  }
});
test("Solar review covers every mapped field and keeps figures, quantities and payment composites read-only", () => {
  for (const map of templateMaps) {
    const fields = solarDraftFields(map.id);
    assert.deepEqual(
      fields.map((field) => field.key),
      [...new Set(map.slots.map((slot) => slot.key))],
    );
    const prepared = prepareSolarDraft(proposal, company, map.id);
    assert.equal(prepared.missing.length, 0);
    assert.deepEqual(draftValueErrors(fields, prepared.values), []);
    for (const key of [
      "total",
      "subtotal",
      "vat",
      "totalWords",
      "paymentInstruction",
      "panelCount",
      "templateQuantity4",
      "firstPaymentText",
      "branchName",
      "siteFullAddress",
    ])
      if (fields.some((field) => field.key === key))
        assert.equal(
          fields.find((field) => field.key === key).readOnly,
          true,
          key,
        );
    assert.equal(
      fields.find((field) => field.key === "customerName").readOnly,
      false,
    );
  }
});
test("draft text rejects XML controls and unbounded text; filenames cannot introduce paths", () => {
  const fields = [{ key: "text", label: "ข้อความ" }];
  assert.ok(draftValueErrors(fields, { text: "bad\u0000value" }).length);
  assert.ok(draftValueErrors(fields, { text: "a".repeat(8001) }).length);
  assert.ok(draftValueErrors(fields, {}).length);
  assert.deepEqual(
    draftValueErrors(fields, { text: "ข้อความ <&> ทดสอบ\nบรรทัดใหม่" }),
    [],
  );
  assert.equal(
    safeDraftFilename("../QT/256910:001", "approval"),
    "___QT_256910_001_approval_DRAFT.docx",
  );
});
