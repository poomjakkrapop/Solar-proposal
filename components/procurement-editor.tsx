"use client";
import { ChevronDown } from "lucide-react";
import { procurementTotals, type Procurement } from "../lib/procurement";
import { money } from "../lib/workspace";

type StringKey = {
  [K in keyof Procurement]: Procurement[K] extends string ? K : never;
}[keyof Procurement];
export function ProcurementEditor({
  value,
  onChange,
}: {
  value: Procurement;
  onChange: (next: Procurement) => void;
}) {
  const text = (key: StringKey, label: string, multiline = false) => (
    <label className={`field ${multiline ? "field-full" : ""}`} key={key}>
      {label}
      {multiline ? (
        <textarea
          rows={3}
          maxLength={4000}
          value={value[key]}
          onChange={(event) =>
            onChange({ ...value, [key]: event.target.value })
          }
        />
      ) : (
        <input
          maxLength={500}
          value={value[key]}
          onChange={(event) =>
            onChange({ ...value, [key]: event.target.value })
          }
        />
      )}
    </label>
  );
  const numeric = (
    key:
      | "budgetGross"
      | "offeredGross"
      | "agreedGross"
      | "vatRate"
      | "deliveryDays",
    label: string,
  ) => (
    <label className="field" key={key}>
      {label}
      <input
        type="number"
        min={0}
        max={key === "vatRate" ? 100 : key === "deliveryDays" ? 3650 : 1e12}
        step={key === "deliveryDays" ? 1 : "0.01"}
        value={value[key]}
        onChange={(event) => {
          const max =
            key === "vatRate" ? 100 : key === "deliveryDays" ? 3650 : 1e12;
          const number = Math.max(
            0,
            Math.min(max, Number(event.target.value) || 0),
          );
          onChange({
            ...value,
            [key]: key === "deliveryDays" ? Math.floor(number) : number,
          });
        }}
      />
    </label>
  );
  const totals = procurementTotals(value.agreedGross, value.vatRate);
  return (
    <div className="editor-form procurement-editor">
      <details className="editor-section" open>
        <summary>
          <span>งาน ผู้รับจ้าง และเลขอ้างอิง</span>
          <ChevronDown size={15} />
        </summary>
        <div className="section-content form-grid">
          {text("projectTitle", "ชื่องานจัดจ้าง")}
          {text("workOrder", "หมายเลข Work Order")}
          {text("purchaseOrder", "หมายเลข PO / ใบสั่งจ้าง")}
          {text("vendorCode", "หมายเลขผู้ขาย")}
          {text("contractorName", "ชื่อผู้รับจ้าง / ผู้เสนอราคา")}
          {text("contractorRepresentative", "ผู้แทนผู้รับจ้าง")}
          {text("contractorAddress", "ที่อยู่ผู้รับจ้าง", true)}
          {text("serviceContract", "เลขสัญญาให้บริการกับลูกค้า")}
          {text("contractorContract", "เลขสัญญาจ้างกับผู้รับจ้าง")}
        </div>
      </details>
      <details className="editor-section">
        <summary>
          <span>วงเงินและกำหนดส่งมอบ</span>
          <ChevronDown size={15} />
        </summary>
        <div className="section-content form-grid">
          {numeric("budgetGross", "วงเงิน / ราคากลางจัดจ้าง รวม VAT (บาท)")}
          {numeric("offeredGross", "ราคาเสนอของผู้รับจ้าง รวม VAT (บาท)")}
          {numeric("agreedGross", "ราคาตกลงจ้าง รวม VAT (บาท)")}
          {numeric("vatRate", "VAT งานจัดจ้าง (%)")}
          {numeric("deliveryDays", "ระยะเวลาส่งมอบ (วัน)")}
          <label className="field">
            วันที่เริ่มงาน
            <input
              type="date"
              min="1900-01-01"
              max="2199-12-31"
              value={value.startDate}
              onChange={(event) =>
                onChange({ ...value, startDate: event.target.value })
              }
            />
          </label>
          <label className="field">
            กำหนดส่งมอบ
            <input
              type="date"
              min="1900-01-01"
              max="2199-12-31"
              value={value.dueDate}
              onChange={(event) =>
                onChange({ ...value, dueDate: event.target.value })
              }
            />
          </label>
          <p className="field-hint field-full">
            ช่องวันที่ใช้ปี ค.ศ. เช่น 2026 (พ.ศ. 2569)
            วงเงินจัดจ้างเป็นคนละยอดกับราคาขายให้ลูกค้า ระบุ VAT
            และจำนวนวันตามเอกสารอนุมัติจริง ค่า 0
            หมายถึงยังไม่ได้ตั้งค่าหรือให้ยืนยันว่าเป็นศูนย์
          </p>
          <dl className="estimate-summary field-full">
            <div>
              <dt>ราคาจ้างก่อน VAT</dt>
              <dd>{money(totals.subtotal)}</dd>
            </div>
            <div>
              <dt>VAT งานจัดจ้าง</dt>
              <dd>{money(totals.vat)}</dd>
            </div>
            <div className="estimate-grand-total">
              <dt>ราคาตกลงจ้างรวม</dt>
              <dd>{money(totals.total)}</dd>
            </div>
          </dl>
        </div>
      </details>
      <details className="editor-section">
        <summary>
          <span>ขอบเขตงาน ผู้รับผิดชอบ และบันทึกทบทวน</span>
          <ChevronDown size={15} />
        </summary>
        <div className="section-content form-grid">
          {text("scope", "ขอบเขตงาน / TOR", true)}
          {text("reason", "เหตุผลและความจำเป็น / เหตุผลวิธีจัดจ้าง", true)}
          {text(
            "procurementCommittee",
            "คณะกรรมการจัดจ้าง (ชื่อ ตำแหน่ง และหน้าที่)",
            true,
          )}
          {text(
            "inspectionCommittee",
            "คณะกรรมการตรวจรับ (ชื่อ ตำแหน่ง และหน้าที่)",
            true,
          )}
          {text("supervisor", "ผู้ควบคุมงาน")}
          {text(
            "legalReviewNote",
            "บันทึกตรวจทานแบบสัญญา หลักเกณฑ์ อัตรา และผู้ตรวจ",
            true,
          )}
          <p className="field-hint field-full">
            ไม่ดึงชื่อกรรมการ ลายเซ็น เงื่อนไขตรวจรับ
            หรือข้อความอนุมัติจากต้นแบบมาเป็นผลของงานนี้
          </p>
        </div>
      </details>
    </div>
  );
}
