"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Eye, LockKeyhole, X } from "lucide-react";
import { draftValueErrors, type DraftField } from "../lib/document-draft";
import { downloadBlob } from "../lib/file-download";
import { WordPreviewDialog } from "./docx-preview";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export function WordDraftDialog({
  title,
  reference,
  fingerprint,
  initialValues,
  fields,
  missing,
  filename,
  generate,
  notice,
  onClose,
}: {
  title: string;
  reference: string;
  fingerprint: string;
  initialValues: Record<string, string>;
  fields: DraftField[];
  missing: string[];
  filename: string;
  generate: (values: Record<string, string>) => Promise<ArrayBuffer>;
  notice: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [initial] = useState(() => ({
    fingerprint,
    values: initialValues,
    fields,
    filename,
  }));
  const [values, setValues] = useState(initial.values);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<ArrayBuffer>();
  const [confirmClose, setConfirmClose] = useState(false);
  const returnToDraft = useRef<HTMLButtonElement>(null);
  const [last, setLast] = useState<{ buffer: ArrayBuffer; values: string }>();
  const latest = useRef(fingerprint);
  latest.current = fingerprint;
  const mounted = useRef(false);
  const changed = initial.fingerprint !== fingerprint;
  const edited = JSON.stringify(values) !== JSON.stringify(initial.values);
  const validation = draftValueErrors(initial.fields, values);
  const editable = initial.fields.filter((field) => !field.readOnly);
  const readonly = initial.fields.filter((field) => field.readOnly);
  const highlights = ["subtotal", "vat", "total"].flatMap((key) =>
    readonly.filter((field) => field.key === key),
  );
  useEffect(() => {
    if (confirmClose) returnToDraft.current?.focus();
  }, [confirmClose]);
  const close = () => {
    if (busy) return;
    if (edited) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    mounted.current = true;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", unload);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", unload);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  async function exportDraft() {
    if (busy || !acknowledged || changed || missing.length || validation.length)
      return;
    setBusy(true);
    setError("");
    setMessage("");
    const snapshot = JSON.stringify(values);
    try {
      const buffer = await generate(values);
      if (!mounted.current || latest.current !== initial.fingerprint) return;
      downloadBlob(new Blob([buffer], { type: DOCX }), initial.filename);
      setLast({ buffer, values: snapshot });
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
    last && last.values === JSON.stringify(values) && !changed;
  return (
    <dialog
      ref={dialog}
      className="word-draft-dialog"
      aria-labelledby="word-draft-title"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }}
    >
      <header className="word-draft-header">
        <div>
          <span className="eyebrow">WORD ฉบับร่าง</span>
          <h2 id="word-draft-title">{title}</h2>
          <p>{reference}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="ปิดร่างเอกสาร"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>
      <div className="word-draft-body" aria-busy={busy}>
        <p className="document-review-notice">{notice}</p>
        <p className="field-hint">
          ข้อความที่แก้ใช้เฉพาะไฟล์ร่างนี้ ไม่บันทึกกลับข้อมูลกลางหรือไฟล์สำรอง
          JSON หากต้องแก้ข้อมูลโครงการ ให้ปิดร่างและแก้ข้อมูลกลางก่อน
        </p>
        {changed && (
          <p className="form-error" role="alert">
            ข้อมูลโครงการเปลี่ยนระหว่างจัดทำ
            กรุณาปิดและเปิดร่างใหม่เพื่อใช้ข้อมูลล่าสุด
          </p>
        )}
        {!!missing.length && (
          <p className="form-error" role="alert">
            ข้อมูลที่ต้องบันทึกก่อน: {missing.join(" · ")}
          </p>
        )}
        {!!validation.length && (
          <p className="form-error" role="alert">
            {validation.join(" · ")}
          </p>
        )}
        {highlights.length > 0 && (
          <dl className="draft-amounts">
            {highlights.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{initial.values[field.key]}</dd>
              </div>
            ))}
          </dl>
        )}
        {readonly.length > 0 && (
          <details className="draft-source-summary">
            <summary>
              <LockKeyhole size={15} /> ตรวจยอดเงินและข้อมูลจากโครงการ (
              {readonly.length} ช่อง)
            </summary>
            <p className="field-hint">
              แก้ยอดเงิน อุปกรณ์ และเงื่อนไขในข้อมูลข้อเสนอ
              แล้วบันทึกก่อนเปิดร่างใหม่
              เพื่อให้ตัวเลขและข้อความทุกตำแหน่งตรงกัน
            </p>
            <dl className="draft-source-values">
              {readonly.map((field) => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>{initial.values[field.key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <h3 className="draft-section-title">ตรวจและปรับข้อความในร่าง</h3>
        <div className="word-draft-fields">
          {editable.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <textarea
                rows={values[field.key].length > 180 ? 4 : 2}
                maxLength={8000}
                aria-label={field.label}
                value={values[field.key]}
                disabled={busy || changed}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }));
                  setAcknowledged(false);
                  setMessage("");
                  setError("");
                  setPreview(undefined);
                  setConfirmClose(false);
                }}
              />
            </label>
          ))}
        </div>
      </div>
      <footer className="word-draft-footer">
        {confirmClose && (
          <div className="draft-close-confirmation" role="alert">
            <p>
              ข้อความที่แก้ในร่างนี้ยังไม่ได้เก็บในข้อมูลกลาง
              ต้องการปิดร่างหรือไม่?
            </p>
            <div className="template-download-actions">
              <button
                type="button"
                className="primary-button"
                ref={returnToDraft}
                onClick={() => setConfirmClose(false)}
              >
                กลับไปแก้ร่าง
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                ปิดและทิ้งข้อความในร่าง
              </button>
            </div>
          </div>
        )}
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
            <Check size={15} />
            {message}
          </p>
        )}
        <div className="template-download-actions">
          <button
            type="button"
            className="primary-button"
            disabled={
              busy ||
              !acknowledged ||
              changed ||
              !!missing.length ||
              !!validation.length
            }
            onClick={() => void exportDraft()}
          >
            <Download size={16} />
            {busy ? "กำลังสร้าง Word…" : "ดาวน์โหลด Word ฉบับร่าง"}
          </button>
          {downloadable && (
            <>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  try {
                    downloadBlob(
                      new Blob([last.buffer], { type: DOCX }),
                      initial.filename,
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
                disabled={busy}
                onClick={() => setPreview(last.buffer)}
              >
                <Eye size={16} />
                ดูตัวอย่างร่าง
              </button>
            </>
          )}
        </div>
      </footer>
      {preview && (
        <WordPreviewDialog
          title={`ร่าง: ${title}`}
          buffer={preview}
          onClose={() => setPreview(undefined)}
        />
      )}
    </dialog>
  );
}
