"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Eye, X } from "lucide-react";
import {
  buildProcurementDocumentValues,
  procurementDocumentReadiness,
  unresolvedProcurementFields,
} from "../lib/procurement-document-data";
import { procurementReferences } from "../lib/procurement-catalog";
import { procurementTemplateMaps } from "../lib/procurement-template-maps";
import { generateMappedDocx } from "../lib/template-engine";
import { downloadBlob } from "../lib/file-download";
import type { ProcurementDocumentId } from "../lib/procurement";
import type { PrivateFile } from "../lib/private-files";
import type { Company, Proposal } from "../lib/workspace";
import { WordPreviewDialog } from "./docx-preview";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export function ProcurementDocumentDraft({
  id,
  proposal,
  company,
  file,
  onClose,
}: {
  id: ProcurementDocumentId;
  proposal: Proposal;
  company: Company;
  file: PrivateFile;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [initial] = useState(() => ({
    fingerprint: JSON.stringify({ proposal, company }),
    values: buildProcurementDocumentValues(proposal, company, id),
  }));
  const [values, setValues] = useState(initial.values);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<ArrayBuffer>();
  const [last, setLast] = useState<{
    buffer: ArrayBuffer;
    filename: string;
    fingerprint: string;
  }>();
  const mounted = useRef(true);
  const action = useRef(0);
  const latest = useRef("");
  const fingerprint = JSON.stringify({ proposal, company });
  latest.current = fingerprint;
  const changed = fingerprint !== initial.fingerprint;
  const metadata = procurementReferences.find((item) => item.id === id)!;
  const missing = procurementDocumentReadiness(proposal, company, id);
  const unresolved = unresolvedProcurementFields(values).length;
  const edited = JSON.stringify(values) !== JSON.stringify(initial.values);
  const close = () => {
    if (busy) return;
    if (
      edited &&
      !window.confirm(
        "ข้อความที่ปรับในร่างนี้ยังไม่ได้เก็บในข้อมูลกลาง ต้องการปิดร่างหรือไม่?",
      )
    )
      return;
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    mounted.current = true;
    dialog.current?.showModal();
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", unload);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", unload);
      previous?.focus();
    };
  }, []);
  async function generate() {
    if (!acknowledged || busy || missing.length || changed) return;
    const ticket = ++action.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const map = procurementTemplateMaps.find((item) => item.id === id);
      if (!map) throw new Error("ยังไม่มีการตั้งค่าต้นแบบนี้");
      const buffer = await generateMappedDocx(file.buffer, map, values);
      if (
        !mounted.current ||
        action.current !== ticket ||
        latest.current !== initial.fingerprint
      )
        return;
      const safeRef = (proposal.documentNumber || proposal.id).replace(
        /[^A-Za-z0-9_-]/g,
        "_",
      );
      const filename = `${safeRef}_${metadata.number}_${id}_DRAFT.docx`;
      downloadBlob(new Blob([buffer], { type: DOCX }), filename);
      setLast({ buffer, filename, fingerprint: JSON.stringify(values) });
      setMessage(
        "ส่งไฟล์ร่างให้เบราว์เซอร์แล้ว ตรวจรายการดาวน์โหลดและเปิดทวนใน Microsoft Word",
      );
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : "สร้างเอกสารไม่สำเร็จ กรุณาลองใหม่",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const downloadable =
    last && last.fingerprint === JSON.stringify(values) && !changed;
  return (
    <dialog
      ref={dialog}
      className="procurement-draft-dialog"
      aria-labelledby="procurement-draft-title"
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
    >
      <div className="panel-head">
        <div>
          <span className="eyebrow">WORD ฉบับร่าง · {metadata.number}</span>
          <h2 id="procurement-draft-title">{metadata.title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="ปิดร่างเอกสารจัดจ้าง"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <p>
        {proposal.documentNumber || proposal.id} · {proposal.customer}
      </p>
      <p className="document-review-notice">
        ใช้รูปแบบจากต้นฉบับที่แนบ ข้อมูลตัวอย่างและข้อความอนุมัติเดิมถูกแทนที่
        ส่วนข้อสัญญาที่เหลือยังเป็นเงื่อนไขต้นแบบ ต้องตรวจให้ตรงงานจริง
        เอกสารนี้ไม่มีลายเซ็นหรือผลอนุมัติจากระบบ
      </p>
      <p className="field-hint">
        แก้ข้อความเฉพาะไฟล์ร่างนี้ได้
        ข้อความที่ปรับด้านล่างไม่บันทึกกลับข้อมูลกลางหรือไฟล์สำรอง JSON
        หากต้องแก้ข้อมูลโครงการให้ปิดร่างและแก้ข้อมูลกลางก่อน
      </p>
      {changed && (
        <p className="form-error" role="alert">
          ข้อมูลโครงการเปลี่ยนระหว่างจัดทำ
          กรุณาปิดและเปิดร่างใหม่เพื่อใช้ข้อมูลล่าสุด
        </p>
      )}
      {missing.length > 0 && (
        <div className="form-error" role="alert">
          ข้อมูลที่ต้องบันทึกก่อน: {missing.join(" · ")}
        </div>
      )}
      <p role="status" className="draft-field-count">
        ข้อความที่มี [รอกรอก: …] {unresolved} ช่อง · ต้องตรวจช่องเว้นว่าง
        และตัวเลือกอื่นในต้นแบบด้วยก่อนใช้จริง
      </p>
      <div className="procurement-draft-fields">
        {Object.entries(initial.values)
          .filter(
            ([, value]) =>
              !!value &&
              !value.includes("ยังไม่ได้ลงนาม") &&
              !value.includes("ยังไม่มีผลอนุมัติ") &&
              !/^\([.]+\)$/.test(value) &&
              !value.startsWith("ที่ ................................"),
          )
          .map(([key, seed], index) => (
            <label className="field" key={key}>
              <span>
                {index + 1}.{" "}
                {seed.startsWith("[รอกรอก:")
                  ? seed.replace(/^\[รอกรอก:\s*/, "").replace(/\]$/, "")
                  : seed.slice(0, 90) + (seed.length > 90 ? "…" : "")}
              </span>
              <textarea
                rows={3}
                aria-label={`ข้อความจัดจ้าง ${index + 1}`}
                maxLength={8000}
                value={values[key]}
                disabled={busy || changed}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }));
                  setAcknowledged(false);
                  setMessage("");
                }}
              />
            </label>
          ))}
      </div>
      <label className="draft-acknowledgement">
        <input
          type="checkbox"
          checked={acknowledged}
          disabled={busy || changed}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        รับทราบว่าเป็นฉบับร่าง ต้องกรอกช่องที่เหลือ ตรวจข้อสัญญา ยอดเงิน
        ผู้ลงนาม และการแบ่งหน้าใน Word ก่อนใช้จริง
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      <div className="template-download-actions">
        <button
          type="button"
          className="primary-button"
          disabled={busy || !acknowledged || changed || !!missing.length}
          onClick={() => void generate()}
        >
          <Download size={16} />
          {busy ? "กำลังสร้าง Word…" : "ดาวน์โหลด Word ฉบับร่าง"}
        </button>
        {downloadable && (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                try {
                  downloadBlob(
                    new Blob([last.buffer], { type: DOCX }),
                    last.filename,
                  );
                  setMessage("ส่งไฟล์ร่างล่าสุดให้เบราว์เซอร์อีกครั้งแล้ว");
                } catch {
                  setError("เบราว์เซอร์ไม่รับคำสั่งดาวน์โหลด กรุณาลองใหม่");
                }
              }}
            >
              <Download size={16} />
              ดาวน์โหลดไฟล์ล่าสุดอีกครั้ง
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPreview(last.buffer)}
            >
              <Eye size={16} />
              ดูตัวอย่างร่าง
            </button>
          </>
        )}
      </div>
      {preview && (
        <WordPreviewDialog
          title={`ร่าง: ${metadata.title}`}
          buffer={preview}
          onClose={() => setPreview(undefined)}
        />
      )}
    </dialog>
  );
}
