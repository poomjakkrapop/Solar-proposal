"use client";

import { useRef, useState, type FormEvent } from "react";
import { calculateEstimate } from "../lib/solar";
import { SolarFields } from "./solar-fields";
import {
  applyPackageEquipment,
  initialCatalogSolar,
  defaultCatalog,
  type Catalog,
} from "../lib/catalog";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Save,
  Upload,
} from "lucide-react";
import {
  money,
  parseWorkspace,
  type Company,
  type Customer,
  type Proposal,
  type Workspace,
} from "../lib/workspace";

type Save = (form: FormData) => void | Promise<void>;
async function submitForm(
  event: FormEvent<HTMLFormElement>,
  save: Save,
  setError: (message: string) => void,
) {
  event.preventDefault();
  try {
    await save(new FormData(event.currentTarget));
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง",
    );
  }
}

export function ProposalEditor({
  catalogData = defaultCatalog,
  proposal,
  customers,
  selectedPackage,
  onSave,
  onCancel,
  readOnly = false,
}: {
  catalogData?: Catalog;
  proposal: Proposal | null;
  customers: Customer[];
  selectedPackage?: string;
  onSave: Save;
  onCancel: () => void;
  readOnly?: boolean;
}) {
  const catalog = catalogData.packages.filter(
    (item) =>
      item.active &&
      [item.panelId, item.inverterId].every(
        (id) => !id || catalogData.equipment.find((e) => e.id === id)?.active,
      ),
  );
  const initialPackage =
    catalog.find(
      (item) => item.name === (proposal?.package || selectedPackage),
    ) ||
    catalog.find((item) => item.name === "Residential Premium") ||
    catalog[0];
  const [customerId, setCustomerId] = useState(proposal?.customerId || "");
  const [customer, setCustomer] = useState(proposal?.customer || "");
  const [contact, setContact] = useState(proposal?.contact || "");
  const [phone, setPhone] = useState(
    proposal?.phone ||
      customers.find((customer) => customer.id === proposal?.customerId)
        ?.phone ||
      "",
  );
  const [location, setLocation] = useState(proposal?.location || "");
  const [packageName, setPackageName] = useState(
    proposal?.package || initialPackage?.name || "ปรับแต่งเอง",
  );
  const [system, setSystem] = useState(
    proposal?.system || initialPackage?.system || 10,
  );
  const [amount, setAmount] = useState(
    proposal?.amount ?? initialPackage?.price ?? 0,
  );
  const [error, setError] = useState("");
  const [solar, setSolar] = useState(() =>
    initialCatalogSolar(proposal, initialPackage, system, catalogData),
  );
  const estimate = calculateEstimate(solar, amount);
  function chooseCustomer(id: string) {
    setCustomerId(id);
    const found = customers.find((item) => item.id === id);
    if (found) {
      setCustomer(found.name);
      setContact(found.contact);
      setPhone(found.phone);
      setLocation(found.location);
    } else {
      setCustomer("");
      setContact("");
      setPhone("");
      setLocation("");
    }
  }
  function choosePackage(name: string) {
    setPackageName(name);
    const item = catalog.find((entry) => entry.name === name);
    if (item) {
      setSystem(item.system);
      setAmount(item.price);
      setSolar((previous) =>
        applyPackageEquipment(previous, item, catalogData),
      );
    }
  }
  return (
    <form
      onSubmit={(event) => submitForm(event, onSave, setError)}
      className="form-body editor-form"
    >
      <div className="form-section-title">
        <span>01</span>
        <div>
          <strong>ลูกค้าและพื้นที่ติดตั้ง</strong>
          <small>เลือกจากรายชื่อเดิม หรือเพิ่มลูกค้าพร้อมข้อเสนอ</small>
        </div>
      </div>
      <div className="form-grid">
        <label className="field field-full">
          เลือกลูกค้า
          <select
            name="customerId"
            value={customerId}
            onChange={(event) => chooseCustomer(event.target.value)}
          >
            <option value="">+ ลูกค้าใหม่</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-full">
          ชื่อลูกค้า
          <input
            name="customer"
            required
            maxLength={200}
            value={customer}
            onChange={(event) => {
              setCustomer(event.target.value);
              if (customerId) setCustomerId("");
            }}
            placeholder="ชื่อบริษัท หรือชื่อเจ้าของบ้าน"
          />
        </label>
        <label className="field">
          ชื่อผู้ติดต่อ
          <input
            name="contact"
            required
            maxLength={200}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
        <label className="field">
          เบอร์โทรศัพท์
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="field field-full">
          พื้นที่ติดตั้ง
          <input
            name="location"
            required
            maxLength={500}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="ที่อยู่ / อำเภอ / จังหวัด"
          />
        </label>
      </div>
      <div className="form-divider" />
      <div className="form-section-title">
        <span>02</span>
        <div>
          <strong>ระบบและราคา</strong>
          <small>ราคาแพ็กเกจเป็นค่าเริ่มต้น สามารถปรับตามโครงการได้</small>
        </div>
      </div>
      <div className="form-grid">
        <label className="field field-full">
          แพ็กเกจ
          <select
            name="package"
            value={packageName}
            onChange={(event) => choosePackage(event.target.value)}
          >
            {catalog.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
            {!catalog.some((item) => item.name === packageName) &&
              packageName !== "ปรับแต่งเอง" && <option>{packageName}</option>}
            <option>ปรับแต่งเอง</option>
          </select>
        </label>
        <label className="field">
          ขนาดระบบ (kWp)
          <input
            name="system"
            type="number"
            min="0.1"
            max="1000000"
            step="0.01"
            required
            value={system}
            onChange={(event) => setSystem(Number(event.target.value))}
          />
        </label>
        <label className="field">
          มูลค่ารวม (บาท)
          <input
            name="amount"
            type="number"
            min="0.01"
            max="1000000000000"
            step="0.01"
            required
            value={solar.pricingMode === "turnkey" ? estimate.total : amount}
            readOnly={solar.pricingMode === "turnkey"}
            onChange={(event) =>
              setAmount(
                Math.max(0, Math.min(1e12, Number(event.target.value) || 0)),
              )
            }
          />
        </label>
        <label className="field field-full">
          หมายเหตุ / เงื่อนไข
          <textarea
            name="notes"
            rows={3}
            maxLength={4000}
            defaultValue={proposal?.notes || ""}
            placeholder="เช่น เงื่อนไขการชำระเงินและขอบเขตงาน"
          />
        </label>
      </div>
      <SolarFields
        details={solar}
        onChange={setSolar}
        system={system}
        fixedTotal={amount}
        documentNumber={proposal?.documentNumber}
      />
      <div className="editor-total">
        <span>ยอดรวมข้อเสนอ</span>
        <strong>{money(estimate.total)}</strong>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          ยกเลิก
        </button>
        <button className="primary-button" disabled={readOnly}>
          <Save size={16} />
          {proposal ? "บันทึกการแก้ไข" : "บันทึกแบบร่าง"}
        </button>
      </div>
      {readOnly && (
        <p role="status" className="form-error">
          ขณะนี้ไม่มีสิทธิ์บันทึก ร่างที่กรอกยังอยู่และคัดลอกเก็บไว้ได้
        </p>
      )}
    </form>
  );
}

export function CustomerEditor({
  customer,
  onSave,
  onCancel,
  readOnly = false,
}: {
  customer: Customer | null;
  onSave: Save;
  onCancel: () => void;
  readOnly?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(event) => submitForm(event, onSave, setError)}
      className="form-body editor-form"
    >
      <div className="form-grid single">
        <label className="field">
          ชื่อลูกค้า
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={customer?.name}
            placeholder="ชื่อบริษัท หรือเจ้าของบ้าน"
          />
        </label>
        <label className="field">
          ชื่อผู้ติดต่อ
          <input
            name="contact"
            required
            maxLength={200}
            defaultValue={customer?.contact}
          />
        </label>
        <label className="field">
          เบอร์โทรศัพท์
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            defaultValue={customer?.phone}
          />
        </label>
        <label className="field">
          อีเมล
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            defaultValue={customer?.email}
          />
        </label>
        <label className="field">
          พื้นที่ติดตั้ง
          <input
            name="location"
            required
            maxLength={500}
            defaultValue={customer?.location}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          ยกเลิก
        </button>
        <button className="primary-button" disabled={readOnly}>
          <Save size={16} />
          {customer ? "บันทึกการแก้ไข" : "บันทึกลูกค้า"}
        </button>
      </div>
      {readOnly && (
        <p role="status" className="form-error">
          ขณะนี้ไม่มีสิทธิ์บันทึก ร่างที่กรอกยังอยู่และคัดลอกเก็บไว้ได้
        </p>
      )}
    </form>
  );
}

export function CompanySettings({
  workspace,
  onSave,
  onBackup,
  onImport,
  shared = false,
  readOnly = false,
}: {
  workspace: Workspace;
  onSave: (company: Company, baseline: Company) => Promise<boolean>;
  onBackup: () => void;
  onImport: (workspace: Workspace, baseline: Workspace) => Promise<boolean>;
  shared?: boolean;
  readOnly?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [companyBase, setCompanyBase] = useState<Company | null>(null);
  const [companyError, setCompanyError] = useState("");
  const companyValue = companyBase || workspace.company;
  const [pendingImport, setPendingImport] = useState<{
    data: Workspace;
    baseline: Workspace;
  } | null>(null);
  const importRequest = useRef(0);
  async function selectBackup(file: File | undefined) {
    const request = ++importRequest.current;
    const baseline = workspace;
    setError("");
    setPendingImport(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("ขนาดไฟล์สำรองต้องไม่เกิน 5 MB");
      return;
    }
    try {
      const data = parseWorkspace(await file.text());
      if (workspace.catalog && !data.catalog)
        throw new Error(
          "ไฟล์สำรองนี้ไม่มีแพ็กเกจและอุปกรณ์ จึงยังแทนข้อมูลปัจจุบันไม่ได้ กรุณาใช้ไฟล์สำรองรุ่นล่าสุด",
        );
      if (request === importRequest.current)
        setPendingImport({ data, baseline });
    } catch (error) {
      if (request === importRequest.current)
        setError(error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ");
    }
  }
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-head">
          <div>
            <h2>ข้อมูลบริษัท</h2>
            <p>ใช้เป็นหัวเอกสารในหน้าพิมพ์ใบเสนอราคา</p>
          </div>
        </div>
        <form
          key={JSON.stringify(companyValue)}
          onChange={() => {
            if (!companyBase) setCompanyBase(workspace.company);
            setMessage("");
            setCompanyError("");
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const company: Company = {
              name: String(form.get("name") || "").trim(),
              address: String(form.get("address") || "").trim(),
              phone: String(form.get("phone") || "").trim(),
              email: String(form.get("email") || "").trim(),
              taxId: String(form.get("taxId") || "").trim(),
              official: companyValue.official,
            };
            if (await onSave(company, companyValue)) {
              setCompanyBase(null);
              setMessage("บันทึกข้อมูลบริษัทแล้ว");
              setCompanyError("");
            } else
              setCompanyError(
                "บันทึกไม่สำเร็จ ข้อมูลล่าสุดอาจเปลี่ยนจากแท็บอื่น กรุณาสำรองข้อความที่กรอกก่อนเปิดหน้าใหม่",
              );
          }}
          className="editor-form settings-form"
        >
          <div className="form-grid">
            <label className="field field-full">
              ชื่อบริษัท
              <input
                name="name"
                readOnly={readOnly}
                required
                maxLength={200}
                defaultValue={companyValue.name}
              />
            </label>
            <label className="field field-full">
              ที่อยู่
              <textarea
                name="address"
                readOnly={readOnly}
                rows={3}
                maxLength={1000}
                defaultValue={companyValue.address}
              />
            </label>
            <label className="field">
              เบอร์โทรศัพท์
              <input
                name="phone"
                readOnly={readOnly}
                type="tel"
                maxLength={30}
                defaultValue={companyValue.phone}
              />
            </label>
            <label className="field">
              อีเมล
              <input
                name="email"
                readOnly={readOnly}
                type="email"
                maxLength={200}
                defaultValue={companyValue.email}
              />
            </label>
            <label className="field field-full">
              เลขประจำตัวผู้เสียภาษี
              <input
                name="taxId"
                readOnly={readOnly}
                inputMode="numeric"
                pattern="[0-9]{13}|"
                maxLength={13}
                defaultValue={companyValue.taxId}
                placeholder="ตัวเลข 13 หลัก (ถ้ามี)"
              />
            </label>
          </div>
          {companyError && (
            <p role="alert" className="form-error">
              {companyError}
            </p>
          )}
          {message && (
            <p role="status" className="form-success">
              <Check size={15} />
              {message}
            </p>
          )}
          <div className="modal-actions">
            <button className="primary-button" disabled={readOnly}>
              <Save size={16} />
              บันทึกข้อมูลบริษัท
            </button>
          </div>
        </form>
      </section>
      <section className="panel settings-panel">
        <div className="panel-head">
          <div>
            <h2>สำรองและนำเข้าข้อมูล</h2>
            <p>
              {shared
                ? "ข้อมูลกลางของพื้นที่ทำงานนี้"
                : "ข้อมูลการทดลองที่บันทึกในเบราว์เซอร์นี้"}
            </p>
          </div>
        </div>
        <div className="backup-summary">
          <FileText size={23} />
          <div>
            <strong>{workspace.proposals.length} ใบเสนอราคา</strong>
            <span>{workspace.customers.length} ลูกค้า</span>
          </div>
        </div>
        <p className="settings-description">
          ดาวน์โหลดไฟล์สำรองเพื่อเก็บข้อมูลหรือย้ายไปใช้ในเบราว์เซอร์อื่น
        </p>
        <button className="secondary-button" onClick={onBackup}>
          <Download size={16} />
          ดาวน์โหลดข้อมูลสำรอง
        </button>
        <div className="form-divider" />
        <label className="field">
          นำเข้าไฟล์สำรอง JSON
          <input
            type="file"
            disabled={readOnly}
            accept="application/json,.json"
            onChange={(event) => {
              void selectBackup(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {pendingImport && (
          <div className="import-preview">
            <Upload size={18} />
            <strong>{pendingImport.data.company.name}</strong>
            <span>
              {pendingImport.data.proposals.length} ใบเสนอราคา ·{" "}
              {pendingImport.data.customers.length} ลูกค้า
              {pendingImport.data.catalog && (
                <>
                  {" "}
                  · {pendingImport.data.catalog.packages.length} แพ็กเกจ ·{" "}
                  {pendingImport.data.catalog.equipment.length} อุปกรณ์
                </>
              )}
            </span>
            <p>
              {shared
                ? "การยืนยันนำเข้าจะส่งข้อมูลใน JSON ขึ้นเซิร์ฟเวอร์และแทนข้อมูลกลางของพื้นที่นี้ สมาชิกที่มีสิทธิ์จะเห็นข้อมูลใหม่"
                : "การนำเข้าจะแทนข้อมูลในเบราว์เซอร์นี้"}
              ควรดาวน์โหลดไฟล์สำรองปัจจุบันเก็บไว้ก่อน
            </p>
            <div className="button-row">
              <button
                className="secondary-button"
                onClick={() => setPendingImport(null)}
              >
                ยกเลิก
              </button>
              <button
                className="primary-button"
                disabled={readOnly}
                onClick={async () => {
                  if (
                    await onImport(pendingImport.data, pendingImport.baseline)
                  ) {
                    setCompanyBase(null);
                    setPendingImport(null);
                    setMessage("นำเข้าข้อมูลสำเร็จ");
                    setError("");
                  } else
                    setError(
                      "ข้อมูลเปลี่ยนระหว่างตรวจไฟล์สำรอง จึงยังไม่แทนข้อมูลล่าสุด กรุณาเลือกไฟล์และตรวจทานใหม่",
                    );
                }}
              >
                ยืนยันนำเข้า <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
