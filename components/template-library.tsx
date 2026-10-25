"use client";

import { useEffect, useState } from "react";
import { Check, Download, Eye, FileText, Upload } from "lucide-react";
import {
  attachTemplate,
  getTemplate,
  type StoredTemplate,
} from "../lib/template-store";
import { buildDocumentValues, documentReadiness } from "../lib/document-data";
import { generateDocx } from "../lib/template-engine";
import type { Company, Proposal } from "../lib/workspace";
import type { TemplateId } from "../lib/template-maps";
import { WordPreviewDialog } from "./docx-preview";

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
  const [preview, setPreview] = useState<{
    title: string;
    buffer: ArrayBuffer;
  }>();
  const proposal = proposals.find((item) => item.id === proposalId);
  useEffect(() => {
    Promise.all(templates.map((template) => getTemplate(template.id)))
      .then((loaded) =>
        setStored(
          Object.fromEntries(
            loaded
              .filter((item): item is StoredTemplate => !!item)
              .map((item) => [item.id, item]),
          ),
        ),
      )
      .catch(() =>
        setError("ไม่สามารถเปิดพื้นที่เก็บต้นแบบในเบราว์เซอร์นี้ได้"),
      );
  }, []);
  async function attach(id: TemplateId, file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(id);
    try {
      const template = await attachTemplate(id, file);
      setStored((current) => ({ ...current, [id]: template }));
      setMessage("บันทึกต้นแบบในเบราว์เซอร์แล้ว");
    } catch (error) {
      setError(error instanceof Error ? error.message : "แนบต้นแบบไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }
  async function exportDocument(id: TemplateId) {
    const template = stored[id];
    if (!template || !proposal) return;
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const buffer = await generateDocx(
        template.buffer,
        id,
        buildDocumentValues(proposal, company),
      );
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${proposal.documentNumber}-${id === "approval" ? "อนุมัติประมาณการ" : "แจ้งค่าใช้จ่าย-ใบเสนอราคา"}.docx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setPreview({ title: "ตัวอย่างเอกสารที่สร้าง", buffer });
      setMessage(
        "สร้าง Word ฉบับร่างแล้ว กรุณาตรวจทุกหน้าใน Microsoft Word ก่อนใช้จริง",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "สร้างเอกสารไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="template-workspace">
      <section className="panel document-selection">
        <label className="field">
          เลือกใบเสนอราคาที่ต้องการสร้างเอกสาร
          <select
            value={proposalId}
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
              <label className="template-upload-label">
                <Upload size={16} />
                {file ? "เปลี่ยนต้นแบบ DOCX" : "แนบต้นแบบ DOCX"}
                <input
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
                disabled={!file || missing.length > 0 || busy !== null}
                onClick={() => void exportDocument(template.id)}
              >
                <Download size={16} />
                {busy === template.id
                  ? "กำลังดำเนินการ…"
                  : "สร้าง Word ฉบับร่าง"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="field-hint">
        ต้นแบบเก็บในเบราว์เซอร์นี้เท่านั้น ไฟล์สำรอง JSON
        เก็บข้อมูลข้อเสนอและหน่วยงาน ส่วนไฟล์ต้นแบบ DOCX ให้เก็บแยกไว้ด้วย
      </p>
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
