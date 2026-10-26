import type { Company, Proposal } from "./workspace";
import {
  amountText,
  bahtText,
  calculateEstimate,
  defaultOfficialProfile,
  thaiLongDate,
} from "./solar.ts";
import type { TemplateId } from "./template-maps";

export function documentReadiness(
  proposal: Proposal,
  company: Company,
  kind: TemplateId,
): string[] {
  const missing: string[] = [];
  const profile = { ...defaultOfficialProfile, ...company.official };
  if (!proposal.documentNumber?.trim())
    missing.push("เลขใบเสนอราคา (บันทึกแบบฟอร์มเพื่อสร้างเลขอัตโนมัติ)");
  if (!profile.branchName.trim())
    missing.push("ชื่อหน่วยงานเต็มในตั้งค่าบริษัท");
  if (!proposal.solar)
    return [...missing, "รายละเอียดระบบและประมาณการในฟอร์มใบเสนอราคา"];
  const solar = proposal.solar;
  let total: number;
  try {
    total = calculateEstimate(solar, proposal.amount).total;
    if (total > 1e12)
      missing.push("ยอดคำนวณเกินขอบเขตเอกสารที่รองรับ กรุณาตรวจประมาณการ");
    const satang = (value: number) =>
      Math.round(value * 100 + Number.EPSILON * Math.max(1, value * 100));
    if (satang(total) !== satang(proposal.amount))
      missing.push(
        "ยอดขายที่บันทึกไม่ตรงกับประมาณการ กรุณาเปิดแก้ไขข้อเสนอ ตรวจยอด และบันทึกอีกครั้ง",
      );
  } catch {
    missing.push("ข้อมูลประมาณการไม่ถูกต้อง กรุณาแก้ไขและบันทึกข้อเสนอ");
    return missing;
  }
  if (kind === "approval") {
    if (total > profile.approvalLimit)
      missing.push("ยอดรวมเกินวงเงินอำนาจอนุมัติ กรุณาตรวจผู้มีอำนาจและวงเงิน");
    if (solar.pricingMode !== "turnkey" || solar.baseCost <= 0)
      missing.push("ต้นทุนและวิธีคำนวณ Turnkey สำหรับบันทึกอนุมัติ");
    for (const [value, label] of [
      [profile.department, "ชื่อแผนก"],
      [profile.preparerName, "ชื่อผู้จัดทำ"],
      [profile.preparerRole, "ตำแหน่งผู้จัดทำ"],
      [profile.managerRole, "ตำแหน่งผู้อนุมัติ"],
      [profile.reviewerRole, "ตำแหน่งผู้ผ่านเรื่อง"],
    ])
      if (!value.trim()) missing.push(label);
  } else {
    if (!solar.letterReference.trim())
      missing.push("เลขที่หนังสือแจ้งค่าใช้จ่าย");
    if (!profile.addressLine1.trim() || !profile.addressLine2.trim())
      missing.push("ที่อยู่หน่วยงานในตั้งค่าบริษัท");
    if (
      !solar.panelBrand.trim() ||
      solar.panelWatt <= 0 ||
      solar.panelCount <= 0
    )
      missing.push("ยี่ห้อ กำลัง และจำนวนแผง PV");
    if (
      !solar.inverterBrand.trim() ||
      !solar.inverterModel.trim() ||
      solar.inverterKw <= 0 ||
      solar.inverterCount <= 0
    )
      missing.push("ยี่ห้อ รุ่น ขนาด และจำนวนอินเวอร์เตอร์");
  }
  return missing;
}
export function buildDocumentValues(
  proposal: Proposal,
  company: Company,
): Record<string, string> {
  if (!proposal.solar) throw new Error("ยังไม่มีรายละเอียดระบบในใบเสนอราคานี้");
  const solar = proposal.solar;
  const profile = { ...defaultOfficialProfile, ...company.official };
  const totals = calculateEstimate(solar, proposal.amount);
  const total = amountText(totals.total);
  const totalWords = bahtText(totals.total);
  const siteFullAddress = [solar.siteName, proposal.location]
    .filter(Boolean)
    .join(" ");
  const blank = (value: string) => value.trim() || "________________";
  let paymentInstruction = `จึงเรียนมาเพื่อโปรดทราบ และพิจารณานำเงินจำนวน ${total} บาท (${totalWords}) ไปชำระที่${profile.branchName}`;
  if (profile.bankAccountNumber.trim() && profile.bankName.trim())
    paymentInstruction += ` หรือโอนเงินเข้าบัญชีออมทรัพย์ ${profile.bankName}${profile.bankBranch ? ` สาขา${profile.bankBranch}` : ""} เลขที่บัญชี ${profile.bankAccountNumber} ชื่อบัญชี${profile.bankAccountName || profile.branchName}`;
  if (profile.chequePayee.trim())
    paymentInstruction += ` หรือจัดทำเช็คขีดคร่อม (account payee only) สั่งจ่าย ${profile.chequePayee}`;
  paymentInstruction +=
    " เพื่อจะได้ดำเนินการติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์ให้ต่อไป";
  return {
    customerName: proposal.customer,
    approvalDecision: "รอพิจารณา",
    dateLong: thaiLongDate(solar.issueDate),
    siteFullAddress,
    preparerRole: blank(profile.preparerRole),
    managerRole: blank(profile.managerRole),
    reviewerRole: blank(profile.reviewerRole),
    department: blank(profile.department),
    branchName: blank(profile.branchName),
    branchShort: blank(profile.branchShort),
    preparerName: blank(profile.preparerName),
    baseCost: amountText(totals.baseCost),
    operations: amountText(totals.operations),
    profit: amountText(totals.profit),
    subtotal: amountText(totals.subtotal),
    vat: amountText(totals.vat),
    total,
    totalWords,
    approvalLimit: amountText(profile.approvalLimit),
    operationsRateDisplay: `${solar.operationsRate} %`,
    profitRateDisplay: `${solar.profitRate}  %`,
    vatRateDisplay: `${solar.vatRate}%`,
    memoNumberLine: `เลขที่ ${solar.memoReference || proposal.documentNumber || ""}    วันที่`,
    requestLine: `ใบคำร้องเลขที่ ${solar.requestNumber || "-"}`,
    systemKw: String(proposal.system),
    phaseThai: `${solar.phase}  เฟส`,
    phaseEnglishLower: `${solar.phase} phase`,
    phaseEnglish: `${solar.phase} Phase`,
    packageLabel: solar.packageLabel,
    letterReference: `ที่ ${solar.letterReference || "________________"}`,
    addressLine1: blank(profile.addressLine1),
    addressLine2: blank(profile.addressLine2),
    validDays: String(solar.validDays),
    panelWatt: String(solar.panelWatt),
    panelBrand: blank(solar.panelBrand),
    panelCount: String(solar.panelCount),
    panelWarrantyYears: String(solar.panelWarrantyYears),
    panelPerformanceYears: String(solar.panelPerformanceYears),
    inverterBrand: blank(solar.inverterBrand),
    inverterModel: blank(solar.inverterModel),
    inverterKw: String(solar.inverterKw),
    inverterCount: String(solar.inverterCount),
    inverterWarrantyYears: String(solar.inverterWarrantyYears),
    batteryText: solar.batteryReady ? "(สามารถรองรับแบตเตอรี่ได้)" : "",
    optimizerCount: String(solar.optimizerCount),
    templateQuantity4: String(solar.templateQuantity4 ?? 1),
    templateQuantity5: String(solar.templateQuantity5 ?? solar.panelCount),
    paymentInstruction,
    scopeSubtitle: `ของ ${siteFullAddress} ขนาด ${proposal.system} กิโลวัตต์ ระบบ ${solar.phase} เฟส แบบ${solar.packageLabel}`,
    monitoringDescription: `- ${solar.monitoringDescription}`,
    optimizerDescription: `PV Optimizer ผลิตภัณฑ์ ${solar.optimizerBrand || "-"} รุ่น ${solar.optimizerModel || "-"}`,
    maintenanceDescription: `ดำเนินการ รับประกันงาน ตรวจเช็คบำรุงดูแลระบบ ${solar.maintenanceYears} ปี ปีละ ${solar.maintenanceVisits} ครั้ง`,
    firstPaymentText: `งวดที่ 1 ก่อนดำเนินการติดตั้ง ชำระเงินร้อยละ ${solar.downPaymentPercent} ของค่าบริการเต็มจำนวนรวมภาษีมูลค่าเพิ่ม ภายใน ${solar.firstPaymentDays} วัน นับแต่วันที่ลูกค้าได้รับใบแจ้งหนี้`,
    finalPaymentText: `งวดที่ 2 เมื่อดำเนินการติดตั้งแล้วเสร็จ ชำระเงินส่วนที่เหลือรวมทั้งค่าธรรมเนียมต่าง ๆ (ถ้ามี) ภายใน ${solar.finalPaymentDays} วัน นับแต่วันที่ลูกค้าได้รับใบแจ้งหนี้`,
    latePaymentText: `ทั้งนี้หากลูกค้าไม่ชำระเงินค่าบริการครบถ้วนตามกำหนดระยะเวลาของงวดที่ดำเนินการติดตั้งแล้วเสร็จ ลูกค้าจะต้องจ่ายดอกเบี้ยผิดนัด คิดเป็นรายวันในอัตราร้อยละ ${solar.lateInterestRate} ต่อปี ของค่าบริการส่วนที่ยังไม่ได้ชำระ`,
    contactLine: `${profile.contactDepartment || profile.branchName}${profile.contactPhone ? ` โทรศัพท์ ${profile.contactPhone}` : ""}`,
  };
}
