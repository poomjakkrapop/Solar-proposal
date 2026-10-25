"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Eye, FileText, Upload } from "lucide-react";
import {
  attachTemplate,
  loadTemplates,
  type StoredTemplate,
} from "../lib/template-store";
import { documentReadiness } from "../lib/document-data";
import type { Company, Proposal } from "../lib/workspace";
import type { TemplateId } from "../lib/template-maps";
import { WordPreviewDialog } from "./docx-preview";
import { SolarDocumentDraft } from "./solar-document-draft";

const templates: { id: TemplateId; title: string; description: string }[] = [
  {
    id: "approval",
    title: "บันทึกอนุมัติประมาณการ Solar",
    description: "ต้นทุน ค่าใช้จ่ายดำเนินการ กำไร VAT และผู้มีอำนาจอนุมัติ",
  },
  {
    id: "quotation",
    title: "แจ้งค่าใช้จ่ายและใบเสนอราคา กฟภ.",
    description: "หนังสือแจ้งค่าใช้จ่าย รายการอุปกรณ์ และเงื่อนไขการชำระเงิน",
  },
];
export function TemplateLibrary({
  proposals,
  company,
  initialProposalId,
  onEdit,
  onSettings,
}: {
  proposals: Proposal[];
  company: Company;
  initialProposalId?: string | null;
  onEdit: (proposal: Proposal) => void;
  onSettings: () => void;
}) {
  const [stored, setStored] = useState<
    Partial<Record<TemplateId, StoredTemplate>>
  >({});
  const [proposalId, setProposalId] = useState(
    initialProposalId || proposals[0]?.id || "",
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<TemplateId | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileErrors, setFileErrors] = useState<
    Partial<Record<TemplateId, string>>
  >({});
  const inputs = useRef<Partial<Record<TemplateId, HTMLInputElement | null>>>(
    {},
  );
  const attached = useRef(new Set<TemplateId>());
  const [draftId, setDraftId] = useState<TemplateId>();
  const [preview, setPreview] = useState<{
    title: string;
    buffer: ArrayBuffer;
  }>();
  const proposal = proposals.find((item) => item.id === proposalId);
  useEffect(() => {
    let active = true;
    void loadTemplates(templates.map((template) => template.id)).then(
      (result) => {
        if (!active) return;
        setStored((current) => ({ ...result.files, ...current }));
        setFileErrors(
          Object.fromEntries(
            Object.entries(result.errors).filter(
              ([id]) => !attached.current.has(id as TemplateId),
            ),
          ),
        );
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  async function attach(id: TemplateId, file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(id);
    try {
      const template = await attachTemplate(id, file);
      attached.current.add(id);
      setStored((current) => ({ ...current, [id]: template }));
      setFileErrors((current) => ({ ...current, [id]: undefined }));
      setMessage(
        template.sessionOnly
          ? "ตรวจต้นแบบผ่านแล้ว ใช้สร้างเอกสารในแท็บนี้ได้ แต่ยังเก็บไว้ในเบราว์เซอร์ไม่ได้ หลังรีเฟรชต้องเลือกไฟล์อีกครั้ง"
          : "แนบต้นแบบแล้ว เปิดเตรียม Word ฉบับร่าง เพื่อตรวจข้อความก่อนดาวน์โหลด",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "แนบต้นแบบไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }
  function openDraft(id: TemplateId) {
    const template = stored[id];
    if (!template) {
      inputs.current[id]?.click();
      return;
    }
    if (!proposal) {
      setError("กรุณาเลือกใบเสนอราคาก่อนสร้างเอกสาร");
      return;
    }
    const missing = documentReadiness(proposal, company, id);
    if (missing.length) {
      setError("ยังสร้างเอกสารไม่ได้: " + missing.join(" · "));
      return;
    }
    setError("");
    setMessage("");
    setDraftId(id);
  }
  return (
    <div className="template-workspace">
      <section className="panel document-selection">
        <label className="field">
          เลือกใบเสนอราคาที่ต้องการสร้างเอกสาร
          <select
            value={proposalId}
            disabled={busy !== null}
            onChange={(event) => setProposalId(event.target.value)}
          >
            <option value="" disabled>
              เลือกใบเสนอราคา
            </option>
            {proposals.map((item) => (
              <option key={item.id} value={item.id}>
                {item.documentNumber || item.id} · {item.customer}
              </option>
            ))}
          </select>
        </label>
        {proposal && (
          <button className="secondary-button" onClick={() => onEdit(proposal)}>
            แก้ไขข้อมูลข้อเสนอ
          </button>
        )}
        <button className="secondary-button" onClick={onSettings}>
          ตั้งค่าหน่วยงาน / ผู้ลงนาม
        </button>
      </section>
      <p className="document-review-notice">
        เอกสารที่สร้างเป็นฉบับร่าง ต้องตรวจยอดเงิน รายการและจำนวนอุปกรณ์
        ข้อความเงื่อนไข ผู้ลงนาม และการแบ่งหน้าใน Microsoft Word
        ก่อนออกเอกสารจริง ภาพตัวอย่างในแอปไม่ใช่รูปแบบพร้อมพิมพ์
      </p>
      <p className="template-local-notice">
        ต้องแนบต้นแบบ DOCX ต้นฉบับให้แต่ละแบบก่อนดาวน์โหลด
        ไฟล์นี้เก็บเฉพาะเบราว์เซอร์และ URL นี้ เมื่อเปลี่ยนเครื่อง เบราว์เซอร์
        หรือ URL อาจต้องแนบใหม่ แม้ข้อมูลข้อเสนอจะอยู่ส่วนกลาง
        ไฟล์ต้นแบบไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          <Check size={15} />
          {message}
        </p>
      )}
      <ol className="document-steps" aria-label="ขั้นตอนสร้างเอกสาร">
        <li>เลือกโครงการ</li>
        <li>แนบต้นแบบ</li>
        <li>ตรวจร่าง</li>
        <li>ดาวน์โหลด Word</li>
      </ol>
      <div className="official-template-grid">
        {templates.map((template) => {
          const file = stored[template.id];
          const missing = proposal
            ? documentReadiness(proposal, company, template.id)
            : ["เลือกใบเสนอราคาก่อน"];
          return (
            <article className="panel official-template-card" key={template.id}>
              <div className="official-template-icon">
                <FileText size={25} />
              </div>
              <h2>{template.title}</h2>
              <p>{template.description}</p>
              <span
                className={`template-readiness ${file && !missing.length ? "ready" : ""}`}
              >
                {file
                  ? missing.length
                    ? "รอเติมข้อมูล"
                    : "พร้อมตรวจร่าง"
                  : "รอแนบต้นแบบ"}
              </span>
              {!file && (
                <div className="template-source-needed" role="status">
                  <strong>
                    {loading
                      ? "กำลังตรวจต้นแบบที่เคยแนบไว้"
                      : "ยังไม่มีต้นแบบในเบราว์เซอร์นี้"}
                  </strong>
                  <p>
                    เลือกต้นฉบับ{" "}
                    {template.id === "approval"
                      ? "อนุมัติประมาณการ (Solar).docx"
                      : "แจ้งค่าใช้จ่าย+ใบเสนอราคา (ฟอร์ม กฟภ.).docx"}{" "}
                    ที่เคยใช้กับระบบ แล้วเปิดตรวจร่างก่อนดาวน์โหลด
                  </p>
                </div>
              )}
              {fileErrors[template.id] && (
                <p role="alert" className="form-error">
                  {fileErrors[template.id]} แนบต้นฉบับใหม่ได้
                  โดยต้นแบบอีกแบบยังใช้งานได้ตามปกติ
                </p>
              )}
              <label className="template-upload-label">
                <Upload size={16} />
                {file ? "เปลี่ยนต้นแบบ DOCX" : "แนบต้นแบบ DOCX"}
                <input
                  ref={(element) => {
                    inputs.current[template.id] = element;
                  }}
                  type="file"
                  accept=".docx"
                  aria-label={`แนบต้นแบบ ${template.title}`}
                  disabled={busy !== null}
                  onChange={(event) => {
                    void attach(template.id, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {file && (
                <div className="attached-template">
                  <Check size={14} />
                  <span>{file.filename}</span>
                  <button
                    className="text-button"
                    onClick={() =>
                      setPreview({
                        title: "ต้นแบบ " + template.title,
                        buffer: file.buffer,
                      })
                    }
                  >
                    <Eye size={14} />
                    ดูต้นแบบ
                  </button>
                </div>
              )}
              {file?.sessionOnly && (
                <p className="field-hint" role="status">
                  ใช้ต้นแบบในแท็บนี้ชั่วคราว พื้นที่เก็บไฟล์ยังไม่พร้อม
                  หลังรีเฟรชให้แนบต้นฉบับอีกครั้ง
                </p>
              )}
              {missing.length > 0 && (
                <div className="document-checklist">
                  <strong>ข้อมูลที่ต้องเติม</strong>
                  <ul>
                    {missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                className="primary-button"
                disabled={(!!file && missing.length > 0) || busy !== null}
                onClick={() => openDraft(template.id)}
              >
                <Download size={16} />
                {busy === template.id
                  ? "กำลังดำเนินการ…"
                  : !file
                    ? "แนบต้นแบบเพื่อสร้าง Word"
                    : "เตรียม Word ฉบับร่าง"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="field-hint">
        ต้นแบบเก็บในเบราว์เซอร์นี้เท่านั้น ไฟล์สำรอง JSON
        เก็บข้อมูลข้อเสนอและหน่วยงาน ส่วนไฟล์ต้นแบบ DOCX ให้เก็บแยกไว้ด้วย
      </p>
      {draftId && proposal && stored[draftId] && (
        <SolarDocumentDraft
          key={`${proposal.id}:${draftId}`}
          id={draftId}
          title={templates.find((item) => item.id === draftId)!.title}
          proposal={proposal}
          company={company}
          file={stored[draftId]}
          onClose={() => setDraftId(undefined)}
        />
      )}
      {preview && (
        <WordPreviewDialog
          title={preview.title}
          buffer={preview.buffer}
          onClose={() => setPreview(undefined)}
        />
      )}
    </div>
  );
}
