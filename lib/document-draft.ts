import { templateMaps, type TemplateId } from "./template-maps.ts";
import { buildDocumentValues, documentReadiness } from "./document-data.ts";
import type { Company, Proposal } from "./workspace.ts";

export type DraftField = { key: string; label: string; readOnly?: boolean };
const labels: Record<string, string> = {
  preparerRole: "ตำแหน่งผู้จัดทำ",
  managerRole: "ตำแหน่งผู้อนุมัติ",
  reviewerRole: "ตำแหน่งผู้ผ่านเรื่อง",
  preparerName: "ชื่อผู้จัดทำ",
  memoNumberLine: "เลขที่บันทึก",
  dateLong: "วันที่เอกสาร",
  customerName: "ชื่อลูกค้า",
  requestLine: "เลขใบคำร้อง",
  department: "แผนก",
  branchName: "หน่วยงาน",
  letterReference: "เลขที่หนังสือแจ้งค่าใช้จ่าย",
  addressLine1: "ที่อยู่หน่วยงาน บรรทัด 1",
  addressLine2: "ที่อยู่หน่วยงาน บรรทัด 2",
  siteFullAddress: "สถานที่ติดตั้ง",
  phaseThai: "ระบบไฟฟ้า",
  systemKw: "ขนาดระบบ (kWp)",
  baseCost: "ต้นทุน (บาท)",
  operations: "ค่าใช้จ่ายดำเนินการ (บาท)",
  operationsRateDisplay: "อัตราค่าใช้จ่ายดำเนินการ",
  profit: "กำไร (บาท)",
  profitRateDisplay: "อัตรากำไร",
  subtotal: "มูลค่าก่อน VAT (บาท)",
  vat: "VAT (บาท)",
  vatRateDisplay: "อัตรา VAT",
  total: "ยอดรวม (บาท)",
  totalWords: "ยอดรวมตัวอักษร",
  approvalLimit: "วงเงินอำนาจอนุมัติ (บาท)",
  packageLabel: "รูปแบบบริการ",
  phaseEnglishLower: "ระบบไฟฟ้าในรายละเอียด",
  phaseEnglish: "ระบบไฟฟ้าในตาราง",
  validDays: "อายุใบเสนอราคา (วัน)",
  paymentInstruction: "คำแนะนำการชำระเงิน",
  scopeSubtitle: "ขอบเขตงานและสถานที่",
  panelBrand: "ยี่ห้อแผง PV",
  panelWatt: "กำลังแผง (W)",
  panelCount: "จำนวนแผง PV",
  panelWarrantyYears: "ประกันแผง (ปี)",
  panelPerformanceYears: "ประกันประสิทธิภาพ (ปี)",
  inverterBrand: "ยี่ห้ออินเวอร์เตอร์",
  inverterModel: "รุ่นอินเวอร์เตอร์",
  inverterKw: "ขนาดอินเวอร์เตอร์ (kW)",
  inverterCount: "จำนวนอินเวอร์เตอร์",
  batteryText: "การรองรับแบตเตอรี่",
  inverterWarrantyYears: "ประกันอินเวอร์เตอร์ (ปี)",
  monitoringDescription: "ระบบติดตามผล",
  optimizerDescription: "รายละเอียด Optimizer",
  maintenanceDescription: "การบำรุงรักษา",
  templateQuantity4: "จำนวนในคอลัมน์รายการที่ 4",
  templateQuantity5: "จำนวนในคอลัมน์รายการที่ 5",
  firstPaymentText: "เงื่อนไขชำระงวดแรก",
  finalPaymentText: "เงื่อนไขชำระงวดสุดท้าย",
  latePaymentText: "เงื่อนไขผิดนัดชำระ",
  contactLine: "หน่วยงานและโทรศัพท์ติดต่อ",
};
// Financial figures, quantities and composite payment terms come from saved data.
// Editing one rendered amount must never desynchronize repeated values or baht text.
const editable = new Set([
  "preparerRole",
  "managerRole",
  "reviewerRole",
  "preparerName",
  "memoNumberLine",
  "dateLong",
  "customerName",
  "requestLine",
  "department",
  "letterReference",
  "addressLine1",
  "addressLine2",
  "contactLine",
]);
export function solarDraftFields(id: TemplateId): DraftField[] {
  const map = templateMaps.find((item) => item.id === id);
  if (!map) throw new Error("ไม่พบประเภทเอกสาร");
  return [...new Set(map.slots.map((slot) => slot.key))].map((key) => {
    if (!labels[key]) throw new Error(`ยังไม่มีชื่อช่องข้อมูล ${key}`);
    return { key, label: labels[key], readOnly: !editable.has(key) };
  });
}
export function draftValueErrors(
  fields: DraftField[],
  values: Record<string, string>,
) {
  return fields.flatMap((field) => {
    const value = values[field.key];
    if (
      typeof value !== "string" ||
      value.length > 8000 ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)
    )
      return [`${field.label}: ข้อความไม่ถูกต้องหรือยาวเกิน 8,000 ตัวอักษร`];
    return [];
  });
}
export function safeDraftFilename(reference: string, kind: string) {
  const safe =
    reference.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) || "SolarDesk";
  return `${safe}_${kind}_DRAFT.docx`;
}
export function prepareSolarDraft(
  proposal: Proposal,
  company: Company,
  id: TemplateId,
) {
  const missing = documentReadiness(proposal, company, id);
  if (missing.length) return { values: {}, missing };
  try {
    return { values: buildDocumentValues(proposal, company), missing };
  } catch {
    return {
      values: {},
      missing: [
        "เตรียมข้อมูลเอกสารไม่สำเร็จ กรุณาตรวจประมาณการและวันที่ในข้อเสนอ",
      ],
    };
  }
}
