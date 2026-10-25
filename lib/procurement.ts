import { calculateEstimate, defaultSolarDetails } from "./solar.ts";

export const procurementDocumentIds = [
  "invitation",
  "service-approval",
  "service-contract",
  "hire-request",
  "award-report",
  "order-annex",
  "signing-notice",
  "signing-annex",
  "works-contract",
  "supervision",
  "acceptance",
] as const;
export type ProcurementDocumentId = (typeof procurementDocumentIds)[number];
export const documentStates = [
  "ยังไม่เริ่ม",
  "กำลังจัดทำ",
  "รอตรวจทาน",
  "ตรวจทานแล้ว",
] as const;
export type DocumentState = (typeof documentStates)[number];
export type ProcurementDocument = {
  reference: string;
  date: string;
  state: DocumentState;
  notes: string;
};
export type Procurement = {
  version: 1;
  projectTitle: string;
  workOrder: string;
  purchaseOrder: string;
  serviceContract: string;
  contractorContract: string;
  contractorName: string;
  contractorAddress: string;
  contractorRepresentative: string;
  vendorCode: string;
  budgetGross: number;
  offeredGross: number;
  agreedGross: number;
  vatRate: number;
  deliveryDays: number;
  startDate: string;
  dueDate: string;
  scope: string;
  reason: string;
  procurementCommittee: string;
  inspectionCommittee: string;
  supervisor: string;
  legalReviewNote: string;
  documents: Partial<Record<ProcurementDocumentId, ProcurementDocument>>;
};
export const defaultProcurementDocument: ProcurementDocument = {
  reference: "",
  date: "",
  state: "ยังไม่เริ่ม",
  notes: "",
};
export function defaultProcurement(): Procurement {
  return {
    version: 1,
    projectTitle: "",
    workOrder: "",
    purchaseOrder: "",
    serviceContract: "",
    contractorContract: "",
    contractorName: "",
    contractorAddress: "",
    contractorRepresentative: "",
    vendorCode: "",
    budgetGross: 0,
    offeredGross: 0,
    agreedGross: 0,
    vatRate: 0,
    deliveryDays: 0,
    startDate: "",
    dueDate: "",
    scope: "",
    reason: "",
    procurementCommittee: "",
    inspectionCommittee: "",
    supervisor: "",
    legalReviewNote: "",
    documents: {},
  };
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function optionalIsoDate(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  if (value < "1900-01-01" || value > "2199-12-31") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export function isProcurement(value: unknown): value is Procurement {
  if (!record(value) || value.version !== 1 || !record(value.documents))
    return false;
  for (const [key, example] of Object.entries(defaultProcurement())) {
    if (["version", "documents"].includes(key)) continue;
    if (
      typeof example === "string" &&
      (typeof value[key] !== "string" || (value[key] as string).length > 4000)
    )
      return false;
    if (
      typeof example === "number" &&
      (typeof value[key] !== "number" ||
        !Number.isFinite(value[key]) ||
        (value[key] as number) < 0 ||
        (value[key] as number) >
          (key === "vatRate" ? 100 : key === "deliveryDays" ? 3650 : 1e12))
    )
      return false;
  }
  if (
    !Number.isInteger(value.deliveryDays) ||
    !optionalIsoDate(value.startDate) ||
    !optionalIsoDate(value.dueDate)
  )
    return false;
  if (value.startDate && value.dueDate && value.startDate > value.dueDate)
    return false;
  return Object.entries(value.documents).every(
    ([id, item]) =>
      procurementDocumentIds.includes(id as ProcurementDocumentId) &&
      record(item) &&
      ["reference", "notes"].every(
        (key) =>
          typeof item[key] === "string" && (item[key] as string).length <= 4000,
      ) &&
      optionalIsoDate(item.date) &&
      documentStates.includes(item.state as DocumentState),
  );
}
export function procurementTotals(gross: number, vatRate: number) {
  return calculateEstimate({ ...defaultSolarDetails(), vatRate }, gross);
}
export function procurementWarnings(data: Procurement): string[] {
  const warnings = [];
  if (!data.contractorName.trim())
    warnings.push("ยังไม่ได้ระบุผู้รับจ้าง — ไม่ใช้ชื่อลูกค้าแทนผู้รับจ้าง");
  if (!data.workOrder.trim()) warnings.push("ยังไม่ได้ระบุเลข Work Order");
  if (!data.agreedGross) warnings.push("ยังไม่ได้ระบุราคาตกลงจ้าง");
  if (data.budgetGross > 0 && data.agreedGross > data.budgetGross)
    warnings.push("ราคาตกลงจ้างสูงกว่าวงเงินที่บันทึก กรุณาตรวจเอกสารอนุมัติ");
  if (data.offeredGross > 0 && data.agreedGross > data.offeredGross)
    warnings.push("ราคาตกลงจ้างสูงกว่าราคาเสนอ กรุณาทวนผลเจรจา");
  if (!data.legalReviewNote.trim())
    warnings.push(
      "ยังไม่มีบันทึกตรวจทานเงื่อนไข/แบบสัญญา ไม่ใช้เกณฑ์วงเงินหรือจำนวนวันในตัวอย่างตัดสินอัตโนมัติ",
    );
  return warnings;
}
