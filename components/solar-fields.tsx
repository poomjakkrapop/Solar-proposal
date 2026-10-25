"use client";

import { useState } from "react";
import { Calculator, ChevronDown, FileText, Save, Sun } from "lucide-react";
import {
  calculateEstimate,
  defaultOfficialProfile,
  isOfficialProfile,
  type OfficialProfile,
  type SolarDetails,
} from "../lib/solar";
import { money } from "../lib/workspace";

function NumericField({
  label,
  value,
  onChange,
  max = 1000000,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  step?: string;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(
            Number.isFinite(next) ? Math.max(0, Math.min(max, next)) : 0,
          );
        }}
      />
    </label>
  );
}
export function EstimateSummary({
  details,
  total,
}: {
  details: SolarDetails;
  total: number;
}) {
  const estimate = calculateEstimate(details, total);
  return (
    <dl className="estimate-summary">
      {details.pricingMode === "turnkey" && (
        <>
          <div>
            <dt>ต้นทุนจ้างเหมา</dt>
            <dd>{money(estimate.baseCost)}</dd>
          </div>
          <div>
            <dt>ค่าใช้จ่ายดำเนินการ {details.operationsRate}%</dt>
            <dd>{money(estimate.operations)}</dd>
          </div>
          <div>
            <dt>
              กำไร {details.profitRate}%{" "}
              <small>ของต้นทุนรวมค่าใช้จ่ายดำเนินการ</small>
            </dt>
            <dd>{money(estimate.profit)}</dd>
          </div>
        </>
      )}
      <div>
        <dt>ราคาก่อน VAT</dt>
        <dd>{money(estimate.subtotal)}</dd>
      </div>
      <div>
        <dt>VAT {details.vatRate}%</dt>
        <dd>{money(estimate.vat)}</dd>
      </div>
      <div className="estimate-grand-total">
        <dt>ยอดรวมสุทธิ</dt>
        <dd>{money(estimate.total)}</dd>
      </div>
    </dl>
  );
}
export function SolarFields({
  details,
  onChange,
  system,
  fixedTotal,
  documentNumber,
}: {
  details: SolarDetails;
  onChange: (details: SolarDetails) => void;
  system: number;
  fixedTotal: number;
  documentNumber?: string;
}) {
  function update<K extends keyof SolarDetails>(
    key: K,
    value: SolarDetails[K],
  ) {
    onChange({ ...details, [key]: value });
  }
  const panelKw = (details.panelWatt * details.panelCount) / 1000;
  return (
    <div className="solar-fields">
      <input type="hidden" name="solar" value={JSON.stringify(details)} />
      <details open className="editor-section">
        <summary>
          <Calculator size={17} />
          <span>ประมาณการค่าใช้จ่าย</span>
          <ChevronDown size={15} />
        </summary>
        <div className="section-content">
          <div className="pricing-options">
            <label>
              <input
                type="radio"
                checked={details.pricingMode === "fixed"}
                onChange={() => update("pricingMode", "fixed")}
              />
              กำหนดยอดรวมเอง
            </label>
            <label>
              <input
                type="radio"
                checked={details.pricingMode === "turnkey"}
                onChange={() => update("pricingMode", "turnkey")}
              />
              คำนวณจากต้นทุน Turnkey
            </label>
          </div>
          <div className="form-grid">
            {details.pricingMode === "turnkey" && (
              <>
                <NumericField
                  label="ต้นทุนจ้างเหมา (บาท)"
                  value={details.baseCost}
                  onChange={(value) => update("baseCost", value)}
                  max={1e12}
                  step="0.01"
                />
                <NumericField
                  label="ค่าใช้จ่ายดำเนินการ (%)"
                  value={details.operationsRate}
                  onChange={(value) => update("operationsRate", value)}
                  max={100}
                  step="0.01"
                />
                <NumericField
                  label="กำไร (%)"
                  value={details.profitRate}
                  onChange={(value) => update("profitRate", value)}
                  max={100}
                  step="0.01"
                />
              </>
            )}
            <NumericField
              label="VAT (%)"
              value={details.vatRate}
              onChange={(value) => update("vatRate", value)}
              max={100}
              step="0.01"
            />
          </div>
          <p className="field-hint">
            อัตราเริ่มต้นมาจากฟอร์มตัวอย่าง ปรับได้ตามงานและหลักเกณฑ์ที่ใช้จริง
          </p>
          <EstimateSummary details={details} total={fixedTotal} />
        </div>
      </details>
      <details className="editor-section">
        <summary>
          <Sun size={17} />
          <span>รายละเอียดระบบและอุปกรณ์</span>
          <ChevronDown size={15} />
        </summary>
        <div className="section-content">
          <div className="form-grid">
            <label className="field">
              ระบบไฟฟ้า
              <select
                value={details.phase}
                onChange={(event) =>
                  update("phase", Number(event.target.value) as 1 | 3)
                }
              >
                <option value={1}>1 เฟส</option>
                <option value={3}>3 เฟส</option>
              </select>
            </label>
            <label className="field">
              ชื่อแพ็กเกจในเอกสาร
              <input
                maxLength={100}
                value={details.packageLabel}
                onChange={(event) => update("packageLabel", event.target.value)}
              />
            </label>
            <label className="field field-full">
              ชื่อสถานที่ / โครงการ
              <input
                maxLength={200}
                value={details.siteName}
                onChange={(event) => update("siteName", event.target.value)}
                placeholder="เช่น บ้านพักอาศัย หรือโรงงาน"
              />
            </label>
          </div>
          <h3 className="form-subheading">แผงโซลาร์เซลล์</h3>
          <div className="form-grid">
            <label className="field">
              ยี่ห้อแผง PV
              <input
                maxLength={100}
                value={details.panelBrand}
                onChange={(event) => update("panelBrand", event.target.value)}
              />
            </label>
            <NumericField
              label="กำลังต่อแผง (W)"
              value={details.panelWatt}
              onChange={(value) => update("panelWatt", value)}
            />
            <NumericField
              label="จำนวนแผง"
              value={details.panelCount}
              onChange={(value) => update("panelCount", value)}
            />
            <NumericField
              label="รับประกันคุณภาพแผง (ปี)"
              value={details.panelWarrantyYears}
              onChange={(value) => update("panelWarrantyYears", value)}
            />
            <NumericField
              label="รับประกันประสิทธิภาพ (ปี)"
              value={details.panelPerformanceYears}
              onChange={(value) => update("panelPerformanceYears", value)}
            />
          </div>
          <p
            className={`field-hint ${Math.abs(panelKw - system) > 0.05 ? "field-warning" : ""}`}
          >
            กำลังแผงรวม {Number(panelKw.toFixed(3))} kWp
            {Math.abs(panelKw - system) > 0.05 &&
              ` — ต่างจากขนาดระบบ ${system} kWp กรุณาตรวจสอบ`}
          </p>
          <h3 className="form-subheading">อินเวอร์เตอร์</h3>
          <div className="form-grid">
            <label className="field">
              ยี่ห้ออินเวอร์เตอร์
              <input
                maxLength={100}
                value={details.inverterBrand}
                onChange={(event) =>
                  update("inverterBrand", event.target.value)
                }
              />
            </label>
            <label className="field">
              รุ่นอินเวอร์เตอร์
              <input
                maxLength={150}
                value={details.inverterModel}
                onChange={(event) =>
                  update("inverterModel", event.target.value)
                }
              />
            </label>
            <NumericField
              label="ขนาดอินเวอร์เตอร์ (kW)"
              value={details.inverterKw}
              onChange={(value) => update("inverterKw", value)}
              step="0.01"
            />
            <NumericField
              label="จำนวนอินเวอร์เตอร์"
              value={details.inverterCount}
              onChange={(value) => update("inverterCount", value)}
            />
            <NumericField
              label="รับประกันอินเวอร์เตอร์ (ปี)"
              value={details.inverterWarrantyYears}
              onChange={(value) => update("inverterWarrantyYears", value)}
            />
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={details.batteryReady}
                onChange={(event) =>
                  update("batteryReady", event.target.checked)
                }
              />
              รองรับแบตเตอรี่
            </label>
          </div>
          <h3 className="form-subheading">ระบบติดตามและบริการ</h3>
          <div className="form-grid">
            <label className="field field-full">
              ระบบบริหารจัดการ / Monitoring
              <input
                maxLength={500}
                value={details.monitoringDescription}
                onChange={(event) =>
                  update("monitoringDescription", event.target.value)
                }
              />
            </label>
            <label className="field">
              ยี่ห้อ Optimizer
              <input
                maxLength={100}
                value={details.optimizerBrand}
                onChange={(event) =>
                  update("optimizerBrand", event.target.value)
                }
              />
            </label>
            <label className="field">
              รุ่น Optimizer
              <input
                maxLength={150}
                value={details.optimizerModel}
                onChange={(event) =>
                  update("optimizerModel", event.target.value)
                }
              />
            </label>
            <NumericField
              label="จำนวนชุดช่องที่ 4 ในต้นแบบ"
              value={details.templateQuantity4 ?? 1}
              onChange={(value) => update("templateQuantity4", value)}
            />
            <NumericField
              label="จำนวนชุดช่องที่ 5 ในต้นแบบ"
              value={details.templateQuantity5 ?? details.panelCount}
              onChange={(value) => update("templateQuantity5", value)}
            />
            <p className="field-hint field-full">
              คอลัมน์จำนวนในต้นแบบเป็นย่อหน้าแยกจากรายการอุปกรณ์ ช่องที่ 4–5
              ให้กรอกตามตำแหน่งในไฟล์ Word โดยตรง
              และตรวจว่าตรงกับรายการก่อนนำไปใช้ ตัวเลขส่วนอื่นยังคงตามต้นแบบ
            </p>
            <NumericField
              label="รับประกัน / บำรุงรักษา (ปี)"
              value={details.maintenanceYears}
              onChange={(value) => update("maintenanceYears", value)}
            />
            <NumericField
              label="บำรุงรักษาต่อปี (ครั้ง)"
              value={details.maintenanceVisits}
              onChange={(value) => update("maintenanceVisits", value)}
            />
          </div>
        </div>
      </details>
      <details className="editor-section">
        <summary>
          <FileText size={17} />
          <span>เลขเอกสารและเงื่อนไขชำระเงิน</span>
          <ChevronDown size={15} />
        </summary>
        <div className="section-content">
          <div className="form-grid">
            <label className="field">
              เลขใบเสนอราคา
              <input
                name="documentNumber"
                maxLength={80}
                defaultValue={documentNumber || ""}
                placeholder="สร้างเลข QT อัตโนมัติเมื่อบันทึก"
              />
            </label>
            <label className="field">
              วันที่เอกสาร
              <input
                type="date"
                required
                value={details.issueDate}
                onChange={(event) => update("issueDate", event.target.value)}
              />
            </label>
            <label className="field">
              เลขใบคำร้อง
              <input
                maxLength={150}
                value={details.requestNumber}
                onChange={(event) =>
                  update("requestNumber", event.target.value)
                }
              />
            </label>
            <NumericField
              label="กำหนดยืนราคา (วัน)"
              value={details.validDays}
              onChange={(value) => update("validDays", value)}
              max={365}
            />
            <label className="field">
              เลขที่บันทึกอนุมัติ
              <input
                maxLength={150}
                value={details.memoReference}
                onChange={(event) =>
                  update("memoReference", event.target.value)
                }
                placeholder="ใช้เลขใบเสนอราคาหากเว้นว่าง"
              />
            </label>
            <label className="field">
              เลขที่หนังสือแจ้งค่าใช้จ่าย
              <input
                maxLength={150}
                value={details.letterReference}
                onChange={(event) =>
                  update("letterReference", event.target.value)
                }
              />
            </label>
            <NumericField
              label="ชำระงวดแรก (%)"
              value={details.downPaymentPercent}
              onChange={(value) => update("downPaymentPercent", value)}
              max={100}
              step="0.01"
            />
            <NumericField
              label="กำหนดชำระงวดแรก (วัน)"
              value={details.firstPaymentDays}
              onChange={(value) => update("firstPaymentDays", value)}
              max={365}
            />
            <NumericField
              label="กำหนดชำระงวดสุดท้าย (วัน)"
              value={details.finalPaymentDays}
              onChange={(value) => update("finalPaymentDays", value)}
              max={365}
            />
            <NumericField
              label="ดอกเบี้ยผิดนัดตามสัญญา (% ต่อปี)"
              value={details.lateInterestRate}
              onChange={(value) => update("lateInterestRate", value)}
              max={100}
              step="0.01"
            />
          </div>
          <p className="field-hint">
            ข้อความเงื่อนไขใช้ตามต้นแบบที่เลือก
            กรุณาตรวจสอบอัตราและกำหนดเวลาก่อนออกเอกสาร
          </p>
        </div>
      </details>
    </div>
  );
}

const officialGroups: {
  title: string;
  fields: [keyof OfficialProfile, string][];
}[] = [
  {
    title: "หน่วยงานและที่อยู่",
    fields: [
      ["branchName", "ชื่อหน่วยงานเต็ม"],
      ["branchShort", "ชื่อย่อหน่วยงาน"],
      ["addressLine1", "ที่อยู่บรรทัดที่ 1"],
      ["addressLine2", "ที่อยู่บรรทัดที่ 2"],
      ["department", "ชื่อย่อแผนกผู้จัดทำ"],
      ["contactDepartment", "แผนกติดต่อท้ายหนังสือ"],
      ["contactPhone", "เบอร์โทรท้ายหนังสือ"],
    ],
  },
  {
    title: "ผู้จัดทำและการอนุมัติ",
    fields: [
      ["preparerName", "ชื่อผู้จัดทำ"],
      ["preparerRole", "ตำแหน่งผู้จัดทำ"],
      ["managerRole", "ตำแหน่งผู้มีอำนาจอนุมัติ"],
      ["reviewerRole", "ตำแหน่งหัวหน้าแผนก / ผู้ผ่านเรื่อง"],
      ["approvalLimit", "วงเงินอำนาจอนุมัติ (บาท)"],
    ],
  },
  {
    title: "ช่องทางชำระเงิน",
    fields: [
      ["bankName", "ชื่อธนาคาร"],
      ["bankBranch", "สาขาธนาคาร"],
      ["bankAccountNumber", "เลขบัญชีรับชำระ"],
      ["bankAccountName", "ชื่อบัญชี"],
      ["chequePayee", "ชื่อผู้รับเช็ค"],
    ],
  },
];
export function OfficialProfileSettings({
  value,
  onSave,
  readOnly = false,
}: {
  value?: OfficialProfile;
  readOnly?: boolean;
  onSave: (
    value: OfficialProfile,
    baseline: OfficialProfile | undefined,
  ) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<{
    profile: OfficialProfile;
    baseline: OfficialProfile | undefined;
  } | null>(null);
  const profile = draft?.profile || { ...defaultOfficialProfile, ...value };
  const [saved, setSaved] = useState(false);
  function updateProfile<K extends keyof OfficialProfile>(
    key: K,
    next: OfficialProfile[K],
  ) {
    setSaved(false);
    setDraft((current) => ({
      baseline: current ? current.baseline : value,
      profile: {
        ...(current?.profile || { ...defaultOfficialProfile, ...value }),
        [key]: next,
      },
    }));
  }
  return (
    <section className="panel official-settings">
      <div className="panel-head">
        <div>
          <h2>ข้อมูลหน่วยงานสำหรับฟอร์ม กฟภ.</h2>
          <p>กรอกครั้งเดียว ใช้ร่วมกับบันทึกอนุมัติและหนังสือแจ้งค่าใช้จ่าย</p>
        </div>
      </div>
      <form
        className="editor-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            isOfficialProfile(profile) &&
            (await onSave(profile, draft ? draft.baseline : value))
          ) {
            setSaved(true);
            setDraft(null);
          }
        }}
      >
        {officialGroups.map((group, index) => (
          <details
            className="editor-section"
            open={index === 0}
            key={group.title}
          >
            <summary>
              <span>{group.title}</span>
              <ChevronDown size={15} />
            </summary>
            <div className="section-content form-grid">
              {group.fields.map(([key, label]) =>
                key === "approvalLimit" ? (
                  <NumericField
                    key={key}
                    label={label}
                    value={profile.approvalLimit}
                    onChange={(value) => updateProfile("approvalLimit", value)}
                    max={1e12}
                    step="0.01"
                  />
                ) : (
                  <label className="field" key={key}>
                    {label}
                    <input
                      maxLength={500}
                      value={profile[key]}
                      onChange={(event) => {
                        updateProfile(key, event.target.value);
                      }}
                    />
                  </label>
                ),
              )}
            </div>
          </details>
        ))}
        {saved && (
          <p className="form-success" role="status">
            บันทึกข้อมูลหน่วยงานแล้ว
          </p>
        )}
        <div className="modal-actions">
          <button className="primary-button" disabled={readOnly}>
            <Save size={16} />
            บันทึกข้อมูลหน่วยงาน
          </button>
        </div>
      </form>
    </section>
  );
}
