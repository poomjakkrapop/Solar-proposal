import type { ProcurementDocumentId } from "./procurement.ts";
export type ProcurementStage =
  | "customer"
  | "selection"
  | "contract"
  | "delivery";
export type ProcurementReference = {
  id: ProcurementDocumentId;
  number: string;
  title: string;
  stage: ProcurementStage;
  fields: string[];
  note: string;
  sha256: string;
  format: string;
  previewable: boolean;
};
export const procurementStages: {
  id: ProcurementStage;
  title: string;
  description: string;
}[] = [
  {
    id: "customer",
    title: "บริการลูกค้า",
    description: "อนุมัติให้บริการและสัญญาหลักกับลูกค้า",
  },
  {
    id: "selection",
    title: "จัดจ้างและคัดเลือก",
    description: "ขอจ้าง เชิญเสนอราคา และรายงานผล",
  },
  {
    id: "contract",
    title: "ใบสั่งจ้างและสัญญา",
    description: "ตรวจแบบ/หลักฐานก่อนลงนามโดยผู้มีอำนาจ",
  },
  {
    id: "delivery",
    title: "ควบคุมงานและตรวจรับ",
    description: "บันทึกผลหน้างานและตรวจรับตามข้อเท็จจริง",
  },
];
export const procurementReferences: ProcurementReference[] = [
  {
    id: "invitation",
    number: "2",
    title: "หนังสือเชิญชวนเสนอราคา",
    stage: "selection",
    fields: ["ผู้รับจ้าง", "ราคากลาง", "วัน/เวลารับข้อเสนอ", "ระยะเวลาส่งมอบ"],
    note: "เลขในชื่อไฟล์ไม่ใช่ลำดับอนุมัติอัตโนมัติ ต้องทวนวันเชิญและวันเสนอราคา",
    sha256: "7bb2d9b870402cbf68ca78f9eacda1ac23546931011e776174c586e72047faf6",
    format: "docx",
    previewable: true,
  },
  {
    id: "service-approval",
    number: "5",
    title: "ขออนุมัติให้บริการ",
    stage: "customer",
    fields: [
      "ข้อมูลลูกค้า",
      "เอกสารอนุมัติประมาณการ",
      "หลักฐานรับชำระ",
      "ต้นทุนจัดจ้าง",
      "คณะกรรมการจัดจ้าง",
    ],
    note: "มีหลายทางเลือกการชำระเงินและรูปแบบดำเนินงาน ต้องเลือกให้ตรงงาน",
    sha256: "bd200be2f4b111fdd2ecaa4e7c785c173f26f080a7b49070660ce721e9d0f44b",
    format: "docx",
    previewable: true,
  },
  {
    id: "service-contract",
    number: "7",
    title: "สัญญาให้บริการกับลูกค้า",
    stage: "customer",
    fields: [
      "คู่สัญญาฝั่งลูกค้า",
      "เลขสัญญาหลัก",
      "ราคาค่าบริการ",
      "งวดชำระ",
      "ผู้มีอำนาจลงนาม",
    ],
    note: "ตัวอย่างมีข้อมูลต่างโครงการ และกำหนดวันชำระหลายช่วงที่ต้องทวน ไม่คัดมาใช้โดยอัตโนมัติ",
    sha256: "f436444db62735cbc678a3368054a9a13fd7875334bb475ac7e5660db4600ac9",
    format: "docx",
    previewable: true,
  },
  {
    id: "hire-request",
    number: "11",
    title: "รายงานขอจ้างโดยวิธีเจาะจง",
    stage: "selection",
    fields: [
      "Work Order",
      "ใบแจ้งหนี้",
      "ราคากลาง/งบประมาณ",
      "เหตุผลวิธีจัดจ้าง",
      "กรรมการตรวจรับ",
      "ผู้ควบคุมงาน",
    ],
    note: "วงเงิน วิธีจัดจ้าง และการเลือกข้อตกลง/สัญญา ต้องให้ผู้รับผิดชอบยืนยันหลักเกณฑ์ที่ใช้จริง",
    sha256: "78f437058f6553879177a37a26241e0938e4e189afd3088901c77ada3a7c3e6d",
    format: "docx",
    previewable: true,
  },
  {
    id: "award-report",
    number: "15",
    title: "รายงานผลและขออนุมัติจัดจ้าง",
    stage: "selection",
    fields: [
      "หนังสือเชิญชวน",
      "ผู้เสนอราคา",
      "เลขใบเสนอราคาผู้รับจ้าง",
      "ราคาเสนอ/ราคาตกลง",
      "ผลเจรจา",
      "เลขผู้ขาย",
    ],
    note: "แยกราคาที่เสนอ ราคาตกลง และราคาขายแก่ลูกค้าออกจากกัน",
    sha256: "df0c86a9716365266220ec011d31003acb082ba57698f0c3fa5013faa0e49f63",
    format: "docx",
    previewable: true,
  },
  {
    id: "order-annex",
    number: "18",
    title: "รายละเอียดแนบท้ายใบสั่งจ้าง",
    stage: "contract",
    fields: [
      "PO",
      "สถานที่/กำหนดส่งมอบ",
      "เอกสารแนบ",
      "งวดชำระ",
      "ประกันผลงาน",
      "การรับประกัน",
      "ค่าปรับ",
    ],
    note: "มีช่องเลือกและเงื่อนไขเว้นว่าง ต้องตรวจพร้อมใบสั่งจ้างจริง",
    sha256: "f7e6aef66cc622bdaa3705053bdfba7e25c654d8a820186dd2609ec9eeb613f9",
    format: "docx",
    previewable: true,
  },
  {
    id: "signing-notice",
    number: "19",
    title: "หนังสือแจ้งลงนามในสัญญา",
    stage: "contract",
    fields: [
      "ผู้รับจ้าง",
      "เลขอ้างอิงข้อเสนอ",
      "ราคาตกลง",
      "กำหนดลงนาม",
      "หลักประกันสัญญา",
    ],
    note: "ไม่กำหนดอัตราหลักประกันหรือวันลงนามจากตัวอย่างโดยไม่ตรวจทาน",
    sha256: "7fff99f26341c2d5e164266e489914a585ebd609fd55d565964ac06ec8c54f8f",
    format: "docx",
    previewable: true,
  },
  {
    id: "signing-annex",
    number: "20",
    title: "เอกสารแนบการแจ้งลงนาม",
    stage: "contract",
    fields: [
      "เลขหนังสือแจ้ง",
      "รายละเอียดสัญญา",
      "วงเงินหลักประกัน",
      "PO",
      "หลักฐานนิติบุคคล/ภาษี/มอบอำนาจ",
    ],
    note: "ใช้เป็นรายการตรวจเอกสาร ไม่เก็บสำเนาบัตรหรือข้อมูลยืนยันตัวตนในต้นแบบสาธารณะ",
    sha256: "05982f4be6917f9b46e54418d34c81813f4e0f05c543bbe1043e5443c8a49736",
    format: "docx",
    previewable: true,
  },
  {
    id: "works-contract",
    number: "22",
    title: "สัญญาจ้างทำของกับผู้รับจ้าง",
    stage: "contract",
    fields: [
      "คู่สัญญาฝั่งผู้รับจ้าง",
      "สัญญาหลัก",
      "วงเงิน",
      "งวดชำระ",
      "วันเริ่ม/สิ้นสุด",
      "ประกัน",
      "ค่าปรับ",
      "เอกสารแนบ",
    ],
    note: "เป็นแบบสัญญาที่มีข้อเลือกหลายกรณี ยังไม่เปิดสร้างหรือเซ็นอัตโนมัติ",
    sha256: "d342ef34d12ea7037f65fc4adfc98ff2ce9301e5e4ef554ca85ec7d3bab9f83b",
    format: "docx",
    previewable: true,
  },
  {
    id: "supervision",
    number: "23",
    title: "รายงานผลการควบคุมงาน",
    stage: "delivery",
    fields: [
      "ผู้ควบคุมงาน",
      "วันปฏิบัติงาน",
      "ผลตรวจหน้างาน",
      "ปัญหา/การแก้ไข",
    ],
    note: "เป็น Word รุ่นเก่า (.doc) ต้องมีสำเนา .docx ที่ตรวจเทียบแล้วก่อนตั้งค่าช่องข้อมูล",
    sha256: "0e1d1959a2b58c7b9f59060a96e91c281b2f687f8bb0ca152c292ed94f072269",
    format: "doc",
    previewable: false,
  },
  {
    id: "acceptance",
    number: "24",
    title: "รายงานผลการตรวจรับงาน",
    stage: "delivery",
    fields: [
      "PO/Work Order",
      "หนังสือส่งมอบ",
      "วันตรวจรับ",
      "ผลตรวจรับจริง",
      "ค่าปรับ",
      "ยอดเบิกจ่าย",
      "กรรมการตรวจรับ",
    ],
    note: "ห้ามใช้ผลตรวจรับ/ข้อความอนุมัติจากตัวอย่างแทนผลตรวจจริง",
    sha256: "eb9648ff65d2bb02cadd8799f5884e0756ae8d972d242129d22896dd405c8fc5",
    format: "docx",
    previewable: true,
  },
];
