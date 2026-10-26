import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultCatalog,
  validateCatalog,
  applyPackageEquipment,
  initialCatalogSolar,
} from "../lib/catalog.ts";
import { parseWorkspace, serializeWorkspace } from "../lib/workspace.ts";
import { defaultSolarDetails } from "../lib/solar.ts";
import { assertUnchanged } from "../lib/edit-conflict.ts";

const workspace = {
  proposals: [],
  customers: [],
  company: { name: "QA", address: "", phone: "", email: "", taxId: "" },
};
function fixture() {
  const data = structuredClone(defaultCatalog);
  data.equipment.push({
    id: "panel",
    type: "PANEL",
    brand: "QA",
    model: "P-600",
    rating: 600,
    spec: "Synthetic",
    active: true,
  });
  data.equipment.push({
    id: "inverter",
    type: "INVERTER",
    brand: "QA",
    model: "I-10",
    rating: 10,
    spec: "Synthetic",
    active: true,
  });
  Object.assign(data.packages[0], {
    panelId: "panel",
    inverterId: "inverter",
    panelCount: 12,
  });
  return data;
}
test("old backups remain readable without silently adding sample catalog records", () => {
  const next = parseWorkspace(serializeWorkspace(workspace));
  assert.equal(next.catalog, undefined);
  assert.deepEqual(next.customers, []);
});
test("catalog backups retain identities, archived entries, equipment references and an intentionally empty catalog", () => {
  const catalog = fixture();
  catalog.equipment[0].active = false;
  assert.deepEqual(
    parseWorkspace(serializeWorkspace({ ...workspace, catalog })).catalog,
    catalog,
  );
  assert.equal(
    JSON.parse(serializeWorkspace({ ...workspace, catalog })).schemaVersion,
    3,
  );
  assert.equal(JSON.parse(serializeWorkspace(workspace)).schemaVersion, 2);
  assert.throws(() =>
    parseWorkspace(JSON.stringify({ schemaVersion: 3, data: workspace })),
  );
  assert.throws(() =>
    parseWorkspace(JSON.stringify({ schemaVersion: "3", data: workspace })),
  );
  const empty = { version: 1, packages: [], equipment: [] };
  assert.deepEqual(
    parseWorkspace(serializeWorkspace({ ...workspace, catalog: empty }))
      .catalog,
    empty,
  );
});
test("invalid versions, duplicate identities/names, wrong equipment types and fractional prices/counts cannot replace a catalog", () => {
  const invalid = [
    (c) => {
      c.version = 2;
    },
    (c) => {
      c.packages[1].name = " residential standard ";
    },
    (c) => {
      c.packages[1].id = c.packages[0].id;
    },
    (c) => {
      c.packages[0].panelId = "inverter";
    },
    (c) => {
      c.packages[0].inverterId = "missing";
    },
    (c) => {
      c.packages[0].panelCount = 2.5;
    },
    (c) => {
      c.packages[0].price = 100.001;
    },
    (c) => {
      c.equipment[0].rating = NaN;
    },
    (c) => {
      c.equipment[0].rating = 600.5;
    },
    (c) => {
      c.packages[0].panelCount = 1000001;
    },
    (c) => {
      c.equipment.push({ ...c.equipment[0], id: "other", brand: " qa " });
    },
  ];
  for (const corrupt of invalid) {
    const catalog = fixture();
    corrupt(catalog);
    assert.throws(() => validateCatalog(catalog));
  }
});
test("package selection copies explicit W/kW specifications without linking historical proposal values to future catalog edits", () => {
  const data = fixture();
  const initial = defaultSolarDetails(10);
  const before = structuredClone(initial);
  const copied = applyPackageEquipment(initial, data.packages[0], data);
  assert.equal(copied.panelWatt, 600);
  assert.equal(copied.packageLabel, data.packages[0].name);
  assert.equal(copied.panelCount, 12);
  assert.equal(
    applyPackageEquipment(initial, { ...data.packages[0], panelCount: 0 }, data)
      .panelCount,
    0,
  );
  assert.equal(copied.panelBrand, "QA P-600");
  assert.equal(copied.inverterKw, 10);
  data.equipment[0].rating = 700;
  data.packages[0].price = 1;
  assert.equal(copied.panelWatt, 600);
  assert.deepEqual(initial, before);
});
test("opening an existing proposal never backfills changed catalog defaults, including older proposals without solar metadata", () => {
  const catalog = fixture();
  const before = defaultSolarDetails(5);
  before.panelBrand = "Original panel";
  assert.deepEqual(
    initialCatalogSolar(
      { package: "Old package", solar: before },
      catalog.packages[0],
      5,
      catalog,
    ),
    before,
  );
  assert.deepEqual(
    initialCatalogSolar(
      { package: "Old package" },
      catalog.packages[0],
      5,
      catalog,
    ),
    { ...defaultSolarDetails(5), packageLabel: "Old package" },
  );
  assert.equal(
    initialCatalogSolar(null, undefined, 5, catalog).packageLabel,
    "ปรับแต่งเอง",
  );
});

test("an open catalog editor rejects newer catalog changes while unrelated business changes can be preserved", () => {
  const original = fixture();
  const changed = structuredClone(original);
  changed.packages[0].price += 1;
  assert.throws(
    () =>
      assertUnchanged(
        { catalog: changed },
        { catalog: original },
        "แค็ตตาล็อก",
      ),
    /เปลี่ยนหลังจากเปิดฟอร์ม/,
  );
  const live = {
    ...workspace,
    customers: [{ id: "new-record" }],
    catalog: original,
  };
  assert.doesNotThrow(() =>
    assertUnchanged(
      { catalog: live.catalog },
      { catalog: original },
      "แค็ตตาล็อก",
    ),
  );
  assert.equal({ ...live, catalog: changed }.customers[0].id, "new-record");
});
