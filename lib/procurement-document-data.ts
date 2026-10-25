import type { Company, Proposal } from "./workspace.ts";
import {
  amountText,
  bahtText,
  defaultOfficialProfile,
  thaiLongDate,
  calculateEstimate,
} from "./solar.ts";
import {
  defaultProcurement,
  defaultProcurementDocument,
  isProcurement,
  procurementTotals,
  type ProcurementDocumentId,
} from "./procurement.ts";
import { procurementTemplateMaps } from "./procurement-template-maps.ts";

export const draftPlaceholder = (label: string) => `[รอกรอก: ${label}]`;
export function procurementDocumentReadiness(
  proposal: Proposal,
  company: Company,
  id: ProcurementDocumentId,
) {
  const data = proposal.procurement || defaultProcurement();
  const doc = data.documents[id] || defaultProcurementDocument;
  const missing: string[] = [];
  if (!isProcurement(data)) missing.push("ข้อมูลจัดจ้างไม่ถูกต้อง");
  if (!procurementTemplateMaps.some((item) => item.id === id))
    missing.push("ต้นแบบ DOC รุ่นเก่ายังไม่รองรับการสร้าง DOCX");
  if (!data.projectTitle.trim()) missing.push("ชื่องานจัดจ้าง");
  if (!doc.reference.trim()) missing.push("เลขอ้างอิงเอกสารนี้");
  if (!doc.date) missing.push("วันที่เอกสารนี้");
  if (!company.official?.branchName.trim())
    missing.push("ชื่อหน่วยงานในตั้งค่าบริษัท");
  if (!proposal.customer.trim()) missing.push("ชื่อลูกค้า");
  if (id === "service-contract" && !proposal.solar)
    missing.push("รายละเอียดระบบและ VAT ฝั่งลูกค้าในใบเสนอราคา");
  if (
    !["service-approval", "service-contract"].includes(id) &&
    !data.contractorName.trim()
  )
    missing.push("ชื่อผู้รับจ้าง");
  return missing;
}
// New-project content only. No private sample text, historical approval, or inspection result is reused.
export function buildProcurementDocumentValues(
  proposal: Proposal,
  company: Company,
  id: ProcurementDocumentId,
): Record<string, string> {
  const data = proposal.procurement || defaultProcurement();
  const doc = data.documents[id] || defaultProcurementDocument;
  const profile = { ...defaultOfficialProfile, ...company.official };
  const blank = (value: string, label: string) =>
    value.trim() || draftPlaceholder(label);
  const branch = blank(profile.branchName, "ชื่อหน่วยงาน");
  const department = blank(profile.department, "แผนก");
  const manager = blank(profile.managerRole, "ตำแหน่งผู้มีอำนาจ");
  const preparer = blank(profile.preparerName, "ผู้จัดทำ");
  const preparerRole = blank(profile.preparerRole, "ตำแหน่งผู้จัดทำ");
  const pending = "รอผู้มีอำนาจพิจารณา / ยังไม่ได้ลงนาม";
  const signature =
    "(............................................................)";
  const date = doc.date
    ? thaiLongDate(doc.date)
    : draftPlaceholder("วันที่เอกสาร");
  const refDate = `เลขที่ ${blank(doc.reference, "เลขอ้างอิง")} วันที่ ${date}`;
  const contractor = blank(data.contractorName, "ชื่อผู้รับจ้าง");
  const title = blank(data.projectTitle, "ชื่องานจัดจ้าง");
  const scope = blank(data.scope, "ขอบเขตงาน / TOR");
  const site =
    [proposal.solar?.siteName, proposal.location].filter(Boolean).join(" ") ||
    draftPlaceholder("สถานที่ติดตั้ง");
  const legal = blank(
    data.legalReviewNote,
    "ผลทบทวนหลักเกณฑ์และเงื่อนไขที่ใช้กับงานนี้",
  );
  const reason = blank(data.reason, "เหตุผลและความจำเป็น / วิธีจัดจ้าง");
  const budget =
    data.budgetGross > 0
      ? amountText(data.budgetGross)
      : draftPlaceholder("วงเงิน / ราคากลาง");
  const offer =
    data.offeredGross > 0
      ? amountText(data.offeredGross)
      : draftPlaceholder("ราคาเสนอ");
  const totals = procurementTotals(data.agreedGross, data.vatRate);
  const agreed =
    data.agreedGross > 0
      ? `${amountText(totals.total)} บาท (${bahtText(totals.total)}) รวม VAT ${data.vatRate}%`
      : draftPlaceholder("ราคาตกลงจ้าง");
  const hireBase =
    data.agreedGross > 0
      ? `${amountText(totals.subtotal)} บาท ไม่รวม VAT ${amountText(totals.vat)} บาท`
      : draftPlaceholder("ราคาจ้างก่อน VAT");
  const sales = proposal.solar
    ? calculateEstimate(proposal.solar, proposal.amount)
    : { total: proposal.amount, vat: undefined };
  const salesText = `${amountText(sales.total)} บาท (${bahtText(sales.total)})`;
  const days =
    data.deliveryDays > 0
      ? `${data.deliveryDays} วัน`
      : draftPlaceholder("ระยะเวลาส่งมอบ");
  const workOrder = blank(data.workOrder, "Work Order");
  const purchaseOrder = blank(data.purchaseOrder, "PO / ใบสั่งจ้าง");
  const serviceContract = blank(data.serviceContract, "เลขสัญญาให้บริการ");
  const contractorContract = blank(data.contractorContract, "เลขสัญญาจ้าง");
  const documentRef = (other: ProcurementDocumentId) => {
    const item = data.documents[other];
    return `${blank(item?.reference || "", "เลขอ้างอิง " + other)} ลงวันที่ ${item?.date ? thaiLongDate(item.date) : draftPlaceholder("วันที่ " + other)}`;
  };
  const committee = (text: string, i: number, label: string) =>
    text
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)[i] || draftPlaceholder(`${label} ลำดับ ${i + 1}`);
  const memoFrom = `จาก ${department} ถึง ${branch}`;
  const memoTo = `เรียน ${manager}`;
  const representative = blank(
    data.contractorRepresentative,
    "ผู้แทนผู้รับจ้างและอำนาจลงนาม",
  );
  const result: Partial<Record<ProcurementDocumentId, Record<string, string>>> =
    {
      invitation: {
        p2: `ที่ ${doc.reference}     ${branch}`,
        p3: blank(profile.addressLine1, "ที่อยู่หน่วยงานบรรทัด 1"),
        p4: blank(profile.addressLine2, "ที่อยู่หน่วยงานบรรทัด 2"),
        p5: `วันที่ ${date}`,
        p7: `เรียน ${contractor}`,
        p10: `ด้วย ${branch} มีความประสงค์จะจ้าง ${title} ให้กับ ${proposal.customer} ขนาด ${proposal.system} kWp ณ ${site} ราคากลาง ${budget} บาท รวม VAT กำหนดส่งมอบ ${days} ${draftPlaceholder("วันเริ่มนับระยะเวลาส่งมอบ")}`,
        p11: `โปรดยื่นข้อเสนอ ณ ${branch} ${draftPlaceholder("วัน เวลาเริ่มและสิ้นสุด และเงื่อนไขรับข้อเสนอ")}`,
        p17: signature,
        p18: manager,
      },
      "service-approval": {
        p1: memoFrom,
        p2: refDate,
        p3: `เรื่อง ขออนุมัติให้บริการ ${title} ให้กับ ${proposal.customer}`,
        p5: memoTo,
        p8: `1.1 ตามเอกสารอนุมัติประมาณการ ${draftPlaceholder("เลขอ้างอิงและวันที่อนุมัติประมาณการ")} งาน ${title} ขนาด ${proposal.system} kWp ให้กับ ${proposal.customer} ราคาขาย ${salesText}`,
        p9: `1.2 หนังสือแจ้งค่าใช้จ่าย ${blank(proposal.solar?.letterReference || "", "เลขหนังสือแจ้งค่าใช้จ่าย")} ${draftPlaceholder("วันที่หนังสือแจ้งค่าใช้จ่าย")}`,
        p11: `2.1 ${draftPlaceholder("หนังสือตอบรับของลูกค้า เลขที่และวันที่")}`,
        p12: `2.2 หลักฐานรับชำระของ ${proposal.customer}: ${draftPlaceholder("เลขใบแจ้งหนี้ ใบเสร็จ และวันที่รับชำระจริง")}`,
        p13: draftPlaceholder("การชำระเต็มจำนวน หรือระบุไม่ใช้"),
        p14: draftPlaceholder("การชำระแบบ 2 งวด หรือระบุไม่ใช้"),
        p15: draftPlaceholder("การชำระแบบ 3 งวด หรือระบุไม่ใช้"),
        p18: draftPlaceholder("ค่าแผงกรณีดำเนินการเอง หรือระบุไม่ใช้"),
        p19: draftPlaceholder(
          "ค่าอินเวอร์เตอร์กรณีดำเนินการเอง หรือระบุไม่ใช้",
        ),
        p20: draftPlaceholder("ค่าอุปกรณ์กรณีดำเนินการเอง หรือระบุไม่ใช้"),
        p22: `ค่าจ้าง ${hireBase}`,
        p23: `2.4 บันทึกตรวจหลักเกณฑ์และอำนาจอนุมัติ: ${legal}`,
        p24: `2.5 ${draftPlaceholder("รูปแบบข้อตกลงหรือสัญญาที่ผู้รับผิดชอบยืนยัน")}`,
        p29: `${department} พิจารณาเสนอให้บริการ ${title} แก่ ${proposal.customer} ตามรายละเอียดที่บันทึกไว้`,
        p30: `3.1 ค่าจ้าง ${hireBase}`,
        p32: `3.3 ${draftPlaceholder("ข้อเสนอรูปแบบสัญญาหรือข้อตกลง")}`,
        p34: committee(data.procurementCommittee, 0, "กรรมการจัดจ้าง"),
        p35: committee(data.procurementCommittee, 1, "กรรมการจัดจ้าง"),
        p36: committee(data.procurementCommittee, 2, "กรรมการจัดจ้าง"),
        p42: `(${preparer})`,
        p43: preparerRole,
        p54: pending,
        p57: signature,
        p58: manager,
        p60: pending,
        p63: signature,
        p64: manager,
      },
      "service-contract": {
        p4: `สัญญาเลขที่ ${serviceContract}`,
        p6: `สัญญาฉบับนี้ทำขึ้น ณ ${branch} ${profile.addressLine1} ${profile.addressLine2} วันที่ ${date} ระหว่าง การไฟฟ้าส่วนภูมิภาค โดย ${draftPlaceholder("ชื่อผู้มีอำนาจลงนามและหลักฐานมอบอำนาจ")} ซึ่งต่อไปเรียกว่า “ผู้ให้บริการ” ฝ่ายหนึ่ง กับ ${proposal.customer}`,
        p7: `ที่อยู่ ${site} โดย ${draftPlaceholder("ผู้แทนลูกค้า ประเภทบุคคล และหลักฐานอำนาจลงนาม")} ซึ่งต่อไปเรียกว่า “ผู้รับบริการ” อีกฝ่ายหนึ่ง`,
        p10: `ผู้ให้บริการตกลงให้บริการ ${title} ขนาด ${proposal.system} kWp ${scope}`,
        p14: `2.1 ${draftPlaceholder("รายการเอกสารแนบท้ายและจำนวนหน้า")} งาน ${title}`,
        p17: `ผู้รับบริการตกลงชำระค่าบริการ ${salesText} รวม VAT ${sales.vat === undefined ? draftPlaceholder("VAT ฝั่งลูกค้า") : amountText(sales.vat)} บาท ${draftPlaceholder("จำนวนงวดชำระตามสัญญา")}`,
        p18: draftPlaceholder("รายละเอียดงวดที่ 1"),
        p19: draftPlaceholder("รายละเอียดงวดที่ 2 หรือไม่ใช้"),
        p20: draftPlaceholder("รายละเอียดงวดที่ 3 หรือไม่ใช้"),
        p21: draftPlaceholder("กำหนดชำระและอัตราดอกเบี้ยที่ตรวจทานแล้ว"),
        p24: draftPlaceholder("กำหนดแล้วเสร็จและสิทธิเลิกสัญญาฝั่งลูกค้า"),
        p26: draftPlaceholder("ความรับผิดในความชำรุดบกพร่องและระยะเวลาที่ตกลง"),
        p35: draftPlaceholder("เงื่อนไขค่าปรับฝั่งลูกค้าที่ตรวจทานแล้ว"),
        p49: signature,
        p50: manager,
        p53: signature,
      },
      "hire-request": {
        p1: memoFrom,
        p2: refDate,
        p4: memoTo,
        p5: `ด้วย ${department} มีความประสงค์ขอจ้าง ${title} หมายเลข Work Order ${workOrder} ${scope}`,
        p7: reason,
        p9: `${title} ขนาด ${proposal.system} kWp ${scope}`,
        p11: `ราคากลาง ${budget} บาท รวม VAT ตาม ${documentRef("service-approval")}`,
        p13: `วงเงิน ${budget} บาท รวม VAT`,
        p15: `กำหนดส่งมอบ ${days} ${draftPlaceholder("วันเริ่มนับระยะเวลา")}`,
        p17: reason,
        p19: draftPlaceholder("หลักเกณฑ์พิจารณาคัดเลือกที่ยืนยันแล้ว"),
        p26: committee(data.inspectionCommittee, 0, "กรรมการตรวจรับ"),
        p27: committee(data.inspectionCommittee, 1, "กรรมการตรวจรับ"),
        p28: committee(data.inspectionCommittee, 2, "กรรมการตรวจรับ"),
        p29: `ผู้ควบคุมงาน ${blank(data.supervisor, "ชื่อและตำแหน่งผู้ควบคุมงาน")}`,
        p38: `(${preparer})`,
        p39: preparerRole,
        p41: legal,
        p42: draftPlaceholder("เงื่อนไขรูปแบบสัญญาที่ตรวจทาน"),
        p44: legal,
        p45: draftPlaceholder("เงื่อนไขรูปแบบสัญญาที่ตรวจทาน"),
        p46: pending,
        p49: signature,
        p50: manager,
        p52: pending,
        p55: signature,
        p56: manager,
      },
      "award-report": {
        p6: branch,
        p10: date,
        p14: memoTo,
        p16: `ตามรายงานขอจ้าง ${documentRef("hire-request")} และอนุมัติให้บริการ ${documentRef("service-approval")}`,
        p19: `: ${workOrder}`,
        p21: `: ${budget} บาท รวม VAT`,
        p25: `: ${budget} บาท`,
        p28: `2.1 ${department} ดำเนินการจัดจ้าง ${title} ${reason}`,
        p31: documentRef("invitation"),
        p34: draftPlaceholder("วันกำหนดยื่นข้อเสนอ"),
        p36: draftPlaceholder("จำนวนผู้รับหนังสือเชิญจริง"),
        p37: contractor,
        p40: draftPlaceholder("จำนวนผู้ยื่นข้อเสนอจริง"),
        p41: contractor,
        p42: draftPlaceholder(
          "ผลตรวจคุณสมบัติ พร้อมเลขอ้างอิงและวันที่ใบเสนอราคาผู้รับจ้าง",
        ),
        p47: contractor,
        p48: offer,
        p53: draftPlaceholder("วิธีและวันที่เจรจาจริง"),
        p54: draftPlaceholder("หลักฐานการเจรจาหรือไม่ใช้"),
        p55: `${contractor} ราคาตกลง ${agreed} ${draftPlaceholder("ผลเจรจาและหนังสือยืนยันราคา")}`,
        p63: contractor,
        p64: offer,
        p65:
          data.agreedGross > 0
            ? amountText(totals.total)
            : draftPlaceholder("ราคาตกลงจ้าง"),
        p68: `เสนอพิจารณาจัดจ้าง ${contractor} หมายเลขผู้ขาย ${blank(data.vendorCode, "หมายเลขผู้ขาย")} ตามผลพิจารณาที่บันทึก`,
        p69: `สถานที่ติดตั้ง ${site}`,
        p70: `กำหนดส่งมอบ ${days} ${draftPlaceholder("วันเริ่มนับกำหนด")} จึงเรียนมาเพื่อโปรดพิจารณา`,
        p72: pending,
        p73: "ยังไม่ได้ลงนามใบสั่งจ้าง",
        p74: "ยังไม่ได้ลงนามหนังสือแจ้ง",
        p78: signature,
        p79: manager,
        p80: pending,
        p81: "ยังไม่ได้ลงนามใบสั่งจ้าง",
        p82: "ยังไม่ได้ลงนามหนังสือแจ้ง",
        p86: signature,
        p87: manager,
        p93: committee(data.procurementCommittee, 0, "กรรมการจัดจ้าง"),
        p94: "",
        p101: committee(data.procurementCommittee, 1, "กรรมการจัดจ้าง"),
        p102: "",
        p109: committee(data.procurementCommittee, 2, "กรรมการจัดจ้าง"),
        p110: "",
      },
      "order-annex": {
        headerPO: `เงื่อนไขแนบท้ายใบสั่งจ้าง เลขที่ ${purchaseOrder}`,
        p1: `ผู้รับจ้างต้องส่งมอบงาน ณ ${site} ภายใน ${days} ${draftPlaceholder("วันเริ่มนับและเงื่อนไขส่งมอบ")}`,
        p3: `2.1 ${scope} ${draftPlaceholder("เอกสารแนบท้ายและจำนวนหน้า")}`,
        p4: `2.2 ${draftPlaceholder("เงื่อนไขรับประกันและบำรุงรักษา")}`,
        p5: `2.3 ${draftPlaceholder("เอกสารเพิ่มเติมหรือไม่ใช้")}`,
        p6: draftPlaceholder("จำนวนงวดชำระ"),
        p7: draftPlaceholder("รายละเอียดการชำระแต่ละงวด"),
        p8: "",
        p9: draftPlaceholder("เงื่อนไขและอัตราหลักประกันผลงาน"),
        p11: draftPlaceholder("การรับประกันความชำรุดบกพร่อง"),
        p12: draftPlaceholder("อัตราค่าปรับและเงื่อนไขที่ตรวจแล้ว"),
        p20: `(${representative})`,
        p21: `วันที่ ${draftPlaceholder("วันลงนามจริง")}`,
        p23: draftPlaceholder("หนังสือมอบอำนาจและวันที่"),
      },
      "signing-notice": {
        p3: `ที่ ${doc.reference}     ${branch}`,
        p4: blank(profile.addressLine1, "ที่อยู่หน่วยงานบรรทัด 1"),
        p5: blank(profile.addressLine2, "ที่อยู่หน่วยงานบรรทัด 2"),
        p7: `วันที่ ${date}`,
        p9: `เรียน ${contractor}`,
        p10: draftPlaceholder("เลขอ้างอิงและวันที่ข้อเสนอผู้รับจ้าง"),
        p11: draftPlaceholder("สิ่งที่ส่งมาด้วยลำดับ 1"),
        p12: draftPlaceholder("สิ่งที่ส่งมาด้วยลำดับ 2 หรือไม่ใช้"),
        p13: `ตามที่ ${branch} ดำเนินการจัดจ้าง ${title} และ ${contractor} เสนอราคา ${offer} บาท รวม VAT ตาม ${draftPlaceholder("หนังสือเสนอราคาและวันที่")}`,
        p14: `ราคาตกลงจ้าง ${agreed} ${draftPlaceholder("กำหนดลงนาม อัตราและจำนวนเงินหลักประกันที่ยืนยันแล้ว")}`,
        p18: signature,
        p19: manager,
      },
      "signing-annex": {
        p1: `เอกสารแนบ ${documentRef("signing-notice")}`,
        p2: draftPlaceholder(
          "ชนิด อัตรา วงเงิน และอายุหลักประกันตามเงื่อนไขอนุมัติ",
        ),
        p4: draftPlaceholder("กำหนดนำส่งหลักฐานและสถานที่ติดต่อ"),
        p28: `หมายเลข PO ${purchaseOrder}`,
      },
      "works-contract": {
        p4: `สัญญาเลขที่ ${contractorContract}`,
        p5: `สัญญาฉบับนี้ทำขึ้น ณ ${branch} ${profile.addressLine1} ${profile.addressLine2} วันที่ ${date} ระหว่าง การไฟฟ้าส่วนภูมิภาค โดย ${draftPlaceholder("ผู้มีอำนาจและหลักฐานมอบอำนาจ")} เรียกว่า “ผู้ว่าจ้าง” กับ ${contractor} ที่อยู่ ${blank(data.contractorAddress, "ที่อยู่ผู้รับจ้าง")} โดย ${representative} เรียกว่า “ผู้รับจ้าง” ${draftPlaceholder("สถานะบุคคล หลักฐานจดทะเบียนและอำนาจลงนาม")}`,
        p8: `ผู้ว่าจ้างให้บริการ ${title} แก่ ${proposal.customer}`,
        p9: `ตามสัญญาหลักเลขที่ ${serviceContract} ${draftPlaceholder("วันที่สัญญาหลัก")}`,
        p10: `ผู้ว่าจ้างตกลงจ้าง ${title} ${scope}`,
        p16: draftPlaceholder("เอกสารแนบท้ายลำดับ 2.1 พร้อมจำนวนหน้า"),
        p17: draftPlaceholder("เอกสารแนบท้ายลำดับ 2.2 หรือไม่ใช้"),
        p18: "",
        p21: draftPlaceholder(
          "ชนิดและวงเงินหลักประกัน อัตรา และเงื่อนไขที่ยืนยัน",
        ),
        p27: `ค่าจ้าง ${agreed} ${draftPlaceholder("ยืนยันเลือกจ่ายเป็นงวดหรือตัดข้อความทางเลือกนี้")}`,
        p28: draftPlaceholder("งวดชำระที่ 1 หรือไม่ใช้"),
        p29: draftPlaceholder("งวดชำระที่ 2 หรือไม่ใช้"),
        p30: "",
        p32: draftPlaceholder("งวดสุดท้ายหรือไม่ใช้"),
        p34: draftPlaceholder(
          "กรณีจ่ายครั้งเดียว หรือระบุไม่ใช้กรณีเลือกจ่ายเป็นงวด",
        ),
        p36: draftPlaceholder("เงินล่วงหน้าและจำนวนเงิน หรือระบุไม่ใช้"),
        p37: draftPlaceholder("หลักประกันเงินล่วงหน้า หรือระบุไม่ใช้"),
        p40: draftPlaceholder("อัตราหักคืนเงินล่วงหน้า หรือระบุไม่ใช้"),
        p48: `วันเริ่มงาน ${data.startDate ? thaiLongDate(data.startDate) : draftPlaceholder("วันเริ่มงาน")} วันสิ้นสุด ${data.dueDate ? thaiLongDate(data.dueDate) : draftPlaceholder("วันสิ้นสุด")} ${draftPlaceholder("เงื่อนไขกำหนดแล้วเสร็จและสิทธิเลิกสัญญาที่ตรวจแล้ว")}`,
        p51: draftPlaceholder(
          "ระยะรับประกัน กำหนดแก้ไข และเงื่อนไขชำรุดบกพร่อง",
        ),
        p115: signature,
        p118: signature,
        p121: signature,
        p124: signature,
      },
      acceptance: {
        p1: `จาก คณะกรรมการตรวจรับ ถึง ${branch}`,
        p2: refDate,
        p3: `เรื่อง รายงานผลตรวจรับ ${title} ให้กับ ${proposal.customer}`,
        p4: memoTo,
        p6: `1.1 ตามรายงานขอจ้าง ${documentRef("hire-request")} Work Order ${workOrder}`,
        p7: `1.2 ตาม PO ${purchaseOrder} สั่งจ้าง ${contractor} งาน ${title} ราคาจ้าง ${agreed}`,
        p9: draftPlaceholder(
          "หนังสือส่งมอบ เลขที่ วันที่ และรายละเอียดงานที่ผู้รับจ้างส่งจริง",
        ),
        p10: draftPlaceholder("วันตรวจรับ ผู้ร่วมตรวจ และผลตรวจตามหลักฐานจริง"),
        p12: draftPlaceholder("ผลตรวจครบถ้วนตามสัญญาหรือไม่ใช้"),
        p15: draftPlaceholder("ผลตรวจไม่ครบถ้วนและรายการที่ขาด หรือไม่ใช้"),
        p19: draftPlaceholder("ค่าปรับตามผลคำนวณจริง หรือไม่ใช้"),
        p22: draftPlaceholder("เหตุผลไม่มีค่าปรับ หรือไม่ใช้"),
        p26: draftPlaceholder("ยอดเบิกจ่ายตามผลตรวจและหลักฐานจริง"),
        p27: `หลักเกณฑ์อำนาจอนุมัติและการจ่าย: ${legal}`,
        p32: draftPlaceholder("ความเห็นคณะกรรมการตามผลตรวจจริง"),
        p33: draftPlaceholder("ข้อเสนอการรับมอบตามผลตรวจจริง"),
        p34: draftPlaceholder(
          "ข้อเสนอเบิกจ่าย ก่อน VAT / VAT / ยอดสุทธิ ตามผลตรวจ",
        ),
        p40: committee(data.inspectionCommittee, 0, "กรรมการตรวจรับ"),
        p44: committee(data.inspectionCommittee, 1, "กรรมการตรวจรับ"),
        p48: committee(data.inspectionCommittee, 2, "กรรมการตรวจรับ"),
        p51: "ที่ ........................................",
        p52: memoTo,
        p53: pending,
        p54: "ยังไม่มีผลอนุมัติเบิกจ่าย",
        p57: signature,
        p58: manager,
        p60: "ที่ ........................................",
        p61: memoTo,
        p62: pending,
        p63: "ยังไม่มีผลอนุมัติเบิกจ่าย",
        p66: signature,
        p67: manager,
      },
    };
  const values = result[id];
  const map = procurementTemplateMaps.find((item) => item.id === id);
  if (!values || !map) throw new Error("ต้นแบบนี้ยังไม่รองรับการสร้าง DOCX");
  for (const slot of map.slots)
    if (!(slot.key in values))
      throw new Error(`ยังไม่มีช่องข้อมูล ${slot.key}`);
  return values;
}
export const unresolvedProcurementFields = (values: Record<string, string>) =>
  Object.entries(values).filter(([, value]) => value.includes("[รอกรอก:"));
