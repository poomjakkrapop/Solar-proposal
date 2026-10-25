import { defaultSolarDetails, type SolarDetails } from "./solar.ts";

export type CatalogEquipment = {
  id: string;
  type: "PANEL" | "INVERTER";
  brand: string;
  model: string;
  spec: string;
  rating: number; // PANEL: watts; INVERTER: kW. Zero means unspecified.
  active: boolean;
};
export type CatalogPackage = {
  id: string;
  name: string;
  label: string;
  description: string;
  system: number;
  price: number;
  panelCount: number;
  panelId: string;
  inverterId: string;
  active: boolean;
};
export type Catalog = {
  version: 1;
  packages: CatalogPackage[];
  equipment: CatalogEquipment[];
};
export const defaultCatalog: Catalog = {
  version: 1,
  packages: [
    ["Residential Standard", "บ้านพักอาศัย", 5, 219000],
    ["Residential Premium", "บ้านพักอาศัย", 10, 389000],
    ["Business Pro", "ธุรกิจและอาคาร", 30, 945000],
    ["Industrial Max", "โรงงานอุตสาหกรรม", 100, 2780000],
  ].map(([name, label, system, price], i) => ({
    id: `preset-${i + 1}`,
    name: String(name),
    label: String(label),
    system: Number(system),
    price: Number(price),
    description: "ค่าเริ่มต้นตัวอย่าง ปรับราคาและขอบเขตงานก่อนใช้จริง",
    panelCount: 0,
    panelId: "",
    inverterId: "",
    active: true,
  })),
  equipment: [],
};
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown, max: number, required = false): x is string =>
  typeof x === "string" &&
  x.length <= max &&
  (!required || x.trim().length > 0);
const id = (x: unknown): x is string =>
  typeof x === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(x);
const number = (x: unknown, max: number, min = 0): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const key = (value: string) =>
  value.trim().normalize("NFKC").toLocaleLowerCase("th");
function unique(values: string[]) {
  return new Set(values).size === values.length;
}

export function validateCatalog(value: unknown): Catalog {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.packages) ||
    !Array.isArray(value.equipment) ||
    value.packages.length > 1000 ||
    value.equipment.length > 2000
  )
    throw new Error("รูปแบบหรือเวอร์ชันแค็ตตาล็อกไม่รองรับ ข้อมูลเดิมยังอยู่");
  for (const e of value.equipment) {
    if (
      !record(e) ||
      !id(e.id) ||
      !["PANEL", "INVERTER"].includes(String(e.type)) ||
      !text(e.brand, 200, true) ||
      !text(e.model, 200, true) ||
      !text(e.spec, 2000) ||
      !number(e.rating, 1000000) ||
      (e.type === "PANEL" && !Number.isInteger(e.rating)) ||
      typeof e.active !== "boolean"
    )
      throw new Error("ตรวจประเภท ยี่ห้อ รุ่น และกำลังพิกัดของอุปกรณ์");
  }
  const equipment = value.equipment as CatalogEquipment[];
  for (const p of value.packages) {
    if (
      !record(p) ||
      !id(p.id) ||
      !text(p.name, 200, true) ||
      !text(p.label, 120) ||
      !text(p.description, 2000) ||
      !number(p.system, 1000000, 0.1) ||
      !number(p.price, 1e12) ||
      Math.abs(p.price - Math.round(p.price * 100) / 100) > 1e-9 ||
      !number(p.panelCount, 1000000) ||
      !Number.isInteger(p.panelCount) ||
      !text(p.panelId, 100) ||
      !text(p.inverterId, 100) ||
      typeof p.active !== "boolean"
    )
      throw new Error(
        "ตรวจชื่อ ขนาดระบบ ราคาไม่เกินสองทศนิยม และจำนวนแผงของแพ็กเกจ",
      );
    for (const [ref, type] of [
      [p.panelId, "PANEL"],
      [p.inverterId, "INVERTER"],
    ]) {
      if (ref && !equipment.some((e) => e.id === ref && e.type === type))
        throw new Error("แพ็กเกจอ้างอิงอุปกรณ์ที่ไม่มีอยู่หรือประเภทไม่ตรงกัน");
    }
  }
  const packages = value.packages as CatalogPackage[];
  if (
    !unique(packages.map((p) => p.id)) ||
    !unique(packages.map((p) => key(p.name))) ||
    !unique(equipment.map((e) => e.id)) ||
    !unique(equipment.map((e) => `${e.type}:${key(e.brand)}:${key(e.model)}`))
  )
    throw new Error(
      "รหัส ชื่อแพ็กเกจ หรือยี่ห้อ/รุ่นอุปกรณ์ซ้ำ รวมรายการที่ปิดใช้งานแล้ว",
    );
  return value as Catalog;
}

/** Copy catalog defaults into a draft; never mutate existing proposal snapshots. */
export function applyPackageEquipment(
  details: SolarDetails,
  pkg: CatalogPackage,
  data: Catalog,
): SolarDetails {
  const panel = data.equipment.find((e) => e.id === pkg.panelId);
  const inverter = data.equipment.find((e) => e.id === pkg.inverterId);
  return {
    ...details,
    packageLabel: pkg.name,
    panelCount: pkg.panelCount,
    ...(panel
      ? { panelBrand: `${panel.brand} ${panel.model}`, panelWatt: panel.rating }
      : {}),
    ...(inverter
      ? {
          inverterBrand: inverter.brand,
          inverterModel: inverter.model,
          inverterKw: inverter.rating,
        }
      : {}),
  };
}

export function initialCatalogSolar(
  existing: { package: string; solar?: SolarDetails } | null,
  selected: CatalogPackage | undefined,
  system: number,
  data: Catalog,
): SolarDetails {
  const base = defaultSolarDetails(system);
  if (existing)
    return existing.solar
      ? { ...existing.solar }
      : { ...base, packageLabel: existing.package };
  return selected
    ? applyPackageEquipment(base, selected, data)
    : { ...base, packageLabel: "ปรับแต่งเอง" };
}
