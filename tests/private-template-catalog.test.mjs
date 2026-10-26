import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { builtinTemplateCatalog } from "../lib/builtin-template-catalog.ts";
import { templateMaps } from "../lib/template-maps.ts";
import { procurementTemplateMaps } from "../lib/procurement-template-maps.ts";

test("all thirteen private versions bind uniquely to every reviewed document map without public assets", () => {
  const maps = [...templateMaps, ...procurementTemplateMaps];
  assert.equal(builtinTemplateCatalog.length, 13);
  assert.equal(new Set(builtinTemplateCatalog.map((t) => t.id)).size, 13);
  assert.equal(new Set(builtinTemplateCatalog.map((t) => t.key)).size, 13);
  assert.equal(new Set(builtinTemplateCatalog.map((t) => t.sha256)).size, 13);
  for (const map of maps) {
    const asset = builtinTemplateCatalog.find((t) => t.id === map.id);
    assert.ok(asset, map.id);
    assert.equal(asset.sourceSha256, map.sha256);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.notEqual(asset.sha256, asset.sourceSha256);
    assert.ok(asset.filename.includes(asset.sha256.slice(0, 16)));
  }
  assert.equal(
    maps.reduce((count, map) => count + map.slots.length, 0),
    303,
  );
  assert.equal(
    existsSync(new URL("../public/document-templates", import.meta.url)),
    false,
  );
});
