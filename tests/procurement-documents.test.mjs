import { test } from "node:test";
import assert from "node:assert/strict";
import { procurementTemplateMaps } from "../lib/procurement-template-maps.ts";
import {
  buildProcurementDocumentValues,
  prepareProcurementDraft,
  procurementDocumentReadiness,
  unresolvedProcurementFields,
} from "../lib/procurement-document-data.ts";
import {
  defaultProcurement,
  defaultProcurementDocument,
} from "../lib/procurement.ts";
import { defaultSolarDetails, defaultOfficialProfile } from "../lib/solar.ts";
test("oversized calculated sales text blocks procurement preparation without crashing the workspace", () => {
  const result = prepareProcurementDraft(
    {
      ...proposal,
      solar: {
        ...proposal.solar,
        pricingMode: "turnkey",
        baseCost: 1e12,
        operationsRate: 100,
        profitRate: 100,
        vatRate: 100,
      },
    },
    company,
    "supervision",
  );
  assert.deepEqual(result.values, {});
  assert.ok(result.errors.length);
});
import {
  loadProcurementReferences,
  attachProcurementReference,
  getProcurementReference,
  referenceKey,
  legacyReferenceKey,
  resolveProcurementSource,
  mergeProcurementReference,
} from "../lib/procurement-references.ts";
const company = {
  name: "Synthetic",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  official: {
    ...defaultOfficialProfile,
    branchName: "QA branch",
    department: "QA department",
    preparerName: "QA preparer",
    preparerRole: "QA role",
    managerRole: "QA manager",
    addressLine1: "QA address 1",
    addressLine2: "QA address 2",
  },
};
const proposal = {
  id: "SP-QA",
  documentNumber: "QT-QA",
  customer: "QA customer",
  contact: "",
  location: "QA location",
  system: 13,
  package: "QA",
  amount: 321000,
  status: "ร่าง",
  created: "2026-10-25",
  updated: "2026-10-25",
  solar: { ...defaultSolarDetails(13), issueDate: "2026-10-25" },
  procurement: {
    ...defaultProcurement(),
    projectTitle: "QA installation",
    contractorName: "QA contractor",
    workOrder: "WO-QA",
    purchaseOrder: "PO-QA",
    vendorCode: "VENDOR-QA",
    budgetGross: 300000,
    offeredGross: 280000,
    agreedGross: 267500,
    vatRate: 7,
    deliveryDays: 30,
    documents: Object.fromEntries(
      procurementTemplateMaps.map((item) => [
        item.id,
        {
          ...defaultProcurementDocument,
          reference: "DOC-QA",
          date: "2026-10-25",
        },
      ]),
    ),
  },
};
test("all eleven DOCX templates have complete data slots, unique source hashes and no overlapping ranges", () => {
  assert.equal(procurementTemplateMaps.length, 11);
  assert.equal(
    new Set(procurementTemplateMaps.map((item) => item.sha256)).size,
    11,
  );
  for (const map of procurementTemplateMaps) {
    assert.deepEqual(
      procurementDocumentReadiness(proposal, company, map.id),
      [],
    );
    const values = buildProcurementDocumentValues(proposal, company, map.id);
    for (const slot of map.slots) {
      assert.ok(slot.key in values, `${map.id}:${slot.key}`);
      assert.ok(slot.start >= 0 && slot.end > slot.start);
    }
    assert.equal(
      new Set(map.slots.map((slot) => `${slot.part}:${slot.paragraph}`)).size,
      map.slots.length,
    );
  }
});
test("procurement drafts keep customer sales, vendor offer and agreed hire amounts separate", () => {
  const contract = buildProcurementDocumentValues(
    proposal,
    company,
    "service-contract",
  );
  assert.match(contract.p17, /321,000.00/);
  assert.doesNotMatch(contract.p17, /267,500.00/);
  const award = buildProcurementDocumentValues(
    proposal,
    company,
    "award-report",
  );
  assert.equal(award.p48, "280,000.00");
  assert.equal(award.p64, "280,000.00");
  assert.equal(award.p65, "267,500.00");
  assert.equal(award.p63, "QA contractor");
  assert.ok(!award.p63.includes("QA customer"));
});
test("inspection results, evidence and approval are never inferred from a template or a reviewed register", () => {
  const values = buildProcurementDocumentValues(
    proposal,
    company,
    "acceptance",
  );
  for (const key of [
    "p9",
    "p10",
    "p12",
    "p15",
    "p19",
    "p22",
    "p26",
    "p32",
    "p33",
    "p34",
  ])
    assert.match(values[key], /^\[รอกรอก:/);
  for (const key of ["p53", "p62"]) assert.match(values[key], /รอผู้มีอำนาจ/);
  assert.ok(unresolvedProcurementFields(values).length > 0);
  const next = structuredClone(proposal);
  next.procurement.documents.acceptance.state = "ตรวจทานแล้ว";
  assert.deepEqual(
    buildProcurementDocumentValues(next, company, "acceptance"),
    values,
  );
});
test("missing central data has an explicit readiness message instead of an empty export", () => {
  const empty = { ...proposal, procurement: defaultProcurement() };
  const missing = procurementDocumentReadiness(empty, company, "invitation");
  assert.ok(missing.some((item) => item.includes("ชื่อผู้รับจ้าง")));
  assert.ok(missing.some((item) => item.includes("วันที่")));
  assert.ok(
    procurementDocumentReadiness(
      { ...proposal, solar: undefined },
      company,
      "service-contract",
    ).some((item) => item.includes("VAT ฝั่งลูกค้า")),
  );
  assert.match(
    buildProcurementDocumentValues(
      { ...proposal, procurement: { ...proposal.procurement, agreedGross: 0 } },
      company,
      "award-report",
    ).p65,
    /รอกรอก/,
  );
  assert.deepEqual(
    procurementDocumentReadiness(proposal, company, "supervision"),
    [],
  );
});
test("an unreadable procurement cache entry cannot hide another verified reference", async () => {
  const valid = {
    id: "procurement:invitation",
    filename: "synthetic.docx",
    format: "docx",
    buffer: new ArrayBuffer(1),
    attachedAt: "2026-10-25T00:00:00Z",
  };
  const result = await loadProcurementReferences((id) => {
    if (id === "acceptance") throw Error("unreadable");
    return Promise.resolve(id === "invitation" ? valid : undefined);
  });
  assert.equal(result.files.invitation, valid);
  assert.equal(result.errors.length, 1);
});
test("unreviewed procurement file is rejected before any private persistence", async () => {
  let writes = 0;
  await assert.rejects(
    attachProcurementReference(
      new File(["synthetic wrong source"], "test.docx"),
      "invitation",
      async () => {
        writes++;
      },
    ),
    /ไม่ตรง/,
  );
  assert.equal(writes, 0);
});

test("approved Word container hashes select the DOCX conversion or legacy DOC independently of its filename", () => {
  const map = procurementTemplateMaps.find((item) => item.id === "supervision");
  const legacyHash =
    "0e1d1959a2b58c7b9f59060a96e91c281b2f687f8bb0ca152c292ed94f072269";
  assert.equal(resolveProcurementSource(map.sha256).format, "docx");
  assert.equal(resolveProcurementSource(legacyHash).format, "doc");
  assert.equal(
    resolveProcurementSource(legacyHash).key,
    "procurement:supervision",
  );
  assert.notEqual(
    referenceKey("supervision"),
    legacyReferenceKey("supervision"),
  );
  assert.equal(resolveProcurementSource("f".repeat(64)), undefined);
  for (const item of procurementTemplateMaps)
    assert.equal(resolveProcurementSource(item.sha256).format, "docx");
});
test("conversion cache and original DOC cache are hash-checked separately; one corrupt variant cannot hide the other", async () => {
  const modern = {
    id: referenceKey("supervision"),
    filename: "synthetic.docx",
    buffer: new ArrayBuffer(2),
    attachedAt: "2026-10-25T00:00:00Z",
  };
  const legacy = {
    ...modern,
    id: legacyReferenceKey("supervision"),
    filename: "synthetic.doc",
    buffer: new ArrayBuffer(3),
  };
  const calls = [];
  const both = await getProcurementReference(
    "supervision",
    async (key, hash) => {
      calls.push({ key, hash });
      return key === modern.id ? modern : legacy;
    },
  );
  assert.equal(both.format, "docx");
  assert.equal(both.buffer, modern.buffer);
  assert.equal(both.legacy, legacy);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].hash, calls[1].hash);
  const fallback = await getProcurementReference("supervision", async (key) => {
    if (key === modern.id) throw Error("corrupt conversion");
    return legacy;
  });
  assert.equal(fallback.format, "doc");
  assert.equal(fallback.buffer, legacy.buffer);
  const missingModern = await getProcurementReference(
    "supervision",
    async (key) => (key === modern.id ? undefined : legacy),
  );
  assert.equal(missingModern.format, "doc");
  const badLegacy = await getProcurementReference(
    "supervision",
    async (key) => {
      if (key === legacy.id) throw Error("corrupt original cache");
      return modern;
    },
  );
  assert.equal(badLegacy.format, "docx");
  assert.equal(badLegacy.buffer, modern.buffer);
});
test("attaching the DOC and DOCX in either order keeps the original and never downgrades the draft template", () => {
  const legacy = {
    id: legacyReferenceKey("supervision"),
    filename: "legacy.docx.doc",
    buffer: new ArrayBuffer(3),
    attachedAt: "2026-10-25T00:00:00Z",
    format: "doc",
  };
  const modern = {
    ...legacy,
    id: referenceKey("supervision"),
    filename: "converted.docx",
    buffer: new ArrayBuffer(4),
    format: "docx",
    sessionOnly: true,
  };
  for (const [first, second] of [
    [legacy, modern],
    [modern, legacy],
  ]) {
    const merged = mergeProcurementReference(first, second);
    assert.equal(merged.format, "docx");
    assert.equal(merged.buffer, modern.buffer);
    assert.equal(merged.legacy.buffer, legacy.buffer);
    assert.equal(merged.sessionOnly, true);
  }
});
test("supervision uses saved project references but leaves handover, observed results and recommendations unresolved", () => {
  const values = buildProcurementDocumentValues(
    proposal,
    company,
    "supervision",
  );
  assert.match(values.p7, /WO-QA/);
  assert.match(values.p8, /PO-QA/);
  assert.match(values.p8, /QA contractor/);
  assert.match(values.p8, /267,500.00/);
  for (const key of ["p10", "p11", "p13"])
    assert.match(values[key], /^\[รอกรอก:/);
  const next = structuredClone(proposal);
  next.procurement.documents.supervision.state = "ตรวจทานแล้ว";
  assert.deepEqual(
    buildProcurementDocumentValues(next, company, "supervision"),
    values,
  );
});
