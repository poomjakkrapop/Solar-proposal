"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Eye, FileText, Upload } from "lucide-react";
import {
  attachTemplate,
  loadTemplates,
  type StoredTemplate,
} from "../lib/template-store";
import { buildDocumentValues, documentReadiness } from "../lib/document-data";
import { generateDocx } from "../lib/template-engine";
import { downloadBlob } from "../lib/file-download";
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
  const [loading, setLoading] = useState(true);
  const [fileErrors, setFileErrors] = useState<
    Partial<Record<TemplateId, string>>
  >({});
  const inputs = useRef<Partial<Record<TemplateId, HTMLInputElement | null>>>(
    {},
  );
  const attached = useRef(new Set<TemplateId>());
  const generation = useRef(0);
  const [lastDownload, setLastDownload] = useState<{
    buffer: ArrayBuffer;
    filename: string;
    fingerprint: string;
  }>();
  const [preview, setPreview] = useState<{
    title: string;
    buffer: ArrayBuffer;
  }>();
  const proposal = proposals.find((item) => item.id === proposalId);
  const fingerprint = JSON.stringify({ proposal, company });
  useEffect(() => {
    generation.current += 1;
  }, [fingerprint]);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
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
          : "แนบต้นแบบแล้ว กดดาวน์โหลด Word ในการ์ดเอกสารที่ต้องการได้เลย",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "แนบต้นแบบไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }
  async function exportDocument(id: TemplateId) {
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
    const ticket = ++generation.current;
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const buffer = await generateDocx(
        template.buffer,
        id,
        buildDocumentValues(proposal, company),
      );
      if (ticket !== generation.current)
        throw new Error(
          "ข้อมูลเอกสารเปลี่ยนระหว่างสร้าง กรุณากดดาวน์โหลดใหม่เพื่อใช้ข้อมูลล่าสุด",
        );
      const filename = `${proposal.documentNumber || proposal.id}-${id === "approval" ? "อนุมัติประมาณการ" : "แจ้งค่าใช้จ่าย-ใบเสนอราคา"}.docx`;
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        filename,
      );
      setLastDownload({ buffer, filename, fingerprint });
      setMessage(
        "ส่งไฟล์ Word ให้เบราว์เซอร์แล้ว หากไม่เห็นไฟล์ให้เปิดรายการดาวน์โหลดของเบราว์เซอร์ หรือกดดาวน์โหลดไฟล์ล่าสุดอีกครั้งด้านล่าง กรุณาตรวจใน Microsoft Word ก่อนใช้จริง",
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
      {lastDownload?.fingerprint === fingerprint && (
        <div className="template-download-actions">
          <span>{lastDownload.filename}</span>
          <button
            className="secondary-button"
            onClick={() =>
              downloadBlob(
                new Blob([lastDownload.buffer], {
                  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                }),
                lastDownload.filename,
              )
            }
          >
            <Download size={16} />
            ดาวน์โหลดไฟล์ล่าสุดอีกครั้ง
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              setPreview({
                title: "ตัวอย่างเอกสารที่สร้าง",
                buffer: lastDownload.buffer,
              })
            }
          >
            <Eye size={16} />
            ดูตัวอย่างเอกสารที่สร้าง
          </button>
        </div>
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
                    ที่เคยใช้กับระบบ แล้วกดดาวน์โหลด Word
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
                onClick={() => void exportDocument(template.id)}
              >
                <Download size={16} />
                {busy === template.id
                  ? "กำลังดำเนินการ…"
                  : !file
                    ? "แนบต้นแบบเพื่อสร้าง Word"
                    : "ดาวน์โหลด Word ฉบับร่าง"}
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
