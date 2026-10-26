"use client";

import { useEffect, useState } from "react";
import { Check, Download, Eye, FileText, RotateCcw } from "lucide-react";
import { loadTemplates, type StoredTemplate } from "../lib/template-store";
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
  const selectedId = proposals.some((item) => item.id === proposalId)
    ? proposalId
    : proposals.some((item) => item.id === initialProposalId)
      ? initialProposalId || ""
      : proposals[0]?.id || "";
  const proposal = proposals.find((item) => item.id === selectedId);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [fileErrors, setFileErrors] = useState<
    Partial<Record<TemplateId, string>>
  >({});
  const [draftId, setDraftId] = useState<TemplateId>();
  const [preview, setPreview] = useState<{
    title: string;
    buffer: ArrayBuffer;
  }>();
  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadTemplates(templates.map((template) => template.id))
      .then((result) => {
        if (!active) return;
        setStored((current) => ({ ...current, ...result.files }));
        setFileErrors(result.errors);
      })
      .catch(() => {
        if (active)
          setFileErrors({
            approval: "โหลดต้นแบบระบบไม่สำเร็จ",
            quotation: "โหลดต้นแบบระบบไม่สำเร็จ",
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);
  function retryTemplates() {
    setError("");
    setLoadAttempt((current) => current + 1);
  }
  function openDraft(id: TemplateId) {
    if (!stored[id]) {
      retryTemplates();
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
    setDraftId(id);
  }
  return (
    <div className="template-workspace">
      <section className="panel document-selection">
        <label className="field">
          เลือกใบเสนอราคาที่ต้องการสร้างเอกสาร
          <select
            value={selectedId}
            onChange={(event) => {
              setProposalId(event.target.value);
              setError("");
            }}
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
          <button
            type="button"
            className="secondary-button"
            onClick={() => onEdit(proposal)}
          >
            แก้ไขข้อมูลข้อเสนอ
          </button>
        )}
        <button type="button" className="secondary-button" onClick={onSettings}>
          ตั้งค่าหน่วยงาน / ผู้ลงนาม
        </button>
      </section>
      <p className="template-local-notice">
        ระบบโหลดต้นแบบส่วนกลางให้อัตโนมัติหลังเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ใช้งาน
        ไม่ต้องแนบไฟล์ เติมข้อมูลจากข้อเสนอและหน่วยงานที่บันทึกไว้
        แล้วตรวจร่างก่อนดาวน์โหลด ข้อความที่แก้เฉพาะในร่างใช้กับไฟล์นั้น
        ไม่บันทึกกลับข้อมูลกลาง
      </p>
      <p className="document-review-notice">
        เอกสารที่สร้างเป็นฉบับร่าง ต้องตรวจยอดเงิน รายการและจำนวนอุปกรณ์
        ข้อความเงื่อนไข ผู้ลงนาม และการแบ่งหน้าใน Microsoft Word
        ก่อนออกเอกสารจริง ภาพตัวอย่างในแอปใช้ตรวจเนื้อหา
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ol className="document-steps" aria-label="ขั้นตอนสร้างเอกสาร">
        <li>เลือกโครงการที่บันทึกแล้ว</li>
        <li>ตรวจข้อมูลและร่าง</li>
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
                  : loading
                    ? "กำลังโหลดต้นแบบระบบ"
                    : "โหลดต้นแบบยังไม่สำเร็จ"}
              </span>
              {file && (
                <div className="attached-template">
                  <Check size={14} />
                  <span>ต้นแบบระบบพร้อมใช้</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setPreview({
                        title: "ต้นแบบระบบ: " + template.title,
                        buffer: file.buffer,
                      })
                    }
                  >
                    <Eye size={14} />
                    ดูต้นแบบ
                  </button>
                </div>
              )}
              {fileErrors[template.id] && !file && (
                <div role="alert" className="form-error">
                  {fileErrors[template.id]} ข้อมูลข้อเสนอที่บันทึกไว้ยังอยู่
                  {fileErrors[template.id]?.includes("เข้าสู่ระบบ") && (
                    <p>
                      <a href="/login">เข้าสู่ระบบอีกครั้ง</a>
                    </p>
                  )}
                  {!fileErrors[template.id]?.includes("เข้าสู่ระบบ") &&
                    !fileErrors[template.id]?.includes("ไม่มีสิทธิ์") && (
                      <p>ตรวจการเชื่อมต่อแล้วกดโหลดต้นแบบอีกครั้ง</p>
                    )}
                </div>
              )}
              {missing.length > 0 && (
                <div className="document-checklist">
                  <strong>ข้อมูลที่ต้องเติมก่อนสร้างเอกสาร</strong>
                  <ul>
                    {missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="template-download-actions">
                    {proposal && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onEdit(proposal)}
                      >
                        แก้ข้อมูลข้อเสนอ
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={onSettings}
                    >
                      ตั้งค่าหน่วยงาน
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="primary-button"
                disabled={(!file && loading) || (!!file && missing.length > 0)}
                onClick={() => openDraft(template.id)}
              >
                {!file ? <RotateCcw size={16} /> : <Download size={16} />}
                {!file
                  ? loading
                    ? "กำลังโหลดต้นแบบ…"
                    : "โหลดต้นแบบอีกครั้ง"
                  : "เตรียม Word ฉบับร่าง"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="field-hint">
        เมื่อล็อกอินด้วยบัญชีที่มีสิทธิ์
        ต้นแบบส่วนกลางพร้อมใช้เมื่อเปลี่ยนเครื่องหรือเบราว์เซอร์ ไฟล์สำรอง JSON
        ยังคงเก็บข้อมูลข้อเสนอและหน่วยงานตามเดิม
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
