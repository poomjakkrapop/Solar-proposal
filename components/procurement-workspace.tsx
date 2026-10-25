"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Save,
  Upload,
} from "lucide-react";
import {
  defaultProcurement,
  defaultProcurementDocument,
  documentStates,
  isProcurement,
  procurementWarnings,
  type Procurement,
  type ProcurementDocumentId,
} from "../lib/procurement";
import {
  procurementReferences,
  procurementStages,
  type ProcurementStage,
} from "../lib/procurement-catalog";
import {
  attachProcurementReference,
  loadProcurementReferences,
  type StoredProcurementReference,
} from "../lib/procurement-references";
import { money, type Company, type Proposal } from "../lib/workspace";
import { downloadBlob } from "../lib/file-download";
import { ProcurementDocumentDraft } from "./procurement-document-draft";
import { ProcurementEditor } from "./procurement-editor";
import { WordPreviewDialog } from "./docx-preview";

type SaveProcurement = (
  id: string,
  value: Procurement,
  expected: string,
) => Promise<boolean>;
type StoredReferences = Partial<
  Record<ProcurementDocumentId, StoredProcurementReference>
>;
export function ProcurementWorkspace({
  proposals,
  company,
  onSave,
  onDirtyChange,
}: {
  proposals: Proposal[];
  company: Company;
  onSave: SaveProcurement;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [selected, setSelected] = useState(proposals[0]?.id || "");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  const [references, setReferences] = useState<StoredReferences>({});
  const attachedIds = useRef(new Set<ProcurementDocumentId>());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    title: string;
    buffer: ArrayBuffer;
  }>();
  useEffect(() => {
    let active = true;
    loadProcurementReferences().then(({ files, errors }) => {
      if (!active) return;
      setReferences((current) => ({ ...files, ...current }));
      if (!attachedIds.current.size) setError(errors.join(" · "));
    });
    return () => {
      active = false;
    };
  }, []);
  const proposal = proposals.find((item) => item.id === selected);
  async function attach(files: File[], expectedId?: ProcurementDocumentId) {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    const failures: string[] = [];
    let count = 0;
    for (const file of files) {
      try {
        const result = await attachProcurementReference(file, expectedId);
        attachedIds.current.add(result.id);
        setReferences((current) => ({
          ...current,
          [result.id]: result.stored,
        }));
        count++;
      } catch (error) {
        failures.push(
          error instanceof Error ? error.message : `${file.name}: แนบไม่สำเร็จ`,
        );
      }
    }
    setMessage(
      count
        ? `แนบต้นแบบ ${count} ไฟล์แล้ว เปิด “เตรียม Word ฉบับร่าง” ที่การ์ดเอกสารได้เลย`
        : "",
    );
    setError(failures.join(" · "));
    setBusy(false);
  }
  return (
    <div className="procurement-workspace">
      <section className="panel document-selection">
        <label className="field">
          เลือกโครงการสำหรับชุดจัดจ้าง
          <select
            value={selected}
            onChange={(event) => {
              if (
                dirty &&
                !window.confirm(
                  "มีข้อมูลจัดจ้างที่ยังไม่ได้บันทึก ต้องการเปลี่ยนโครงการและทิ้งเฉพาะการแก้ไขที่ยังไม่บันทึกหรือไม่?",
                )
              )
                return;
              setDirty(false);
              setSelected(event.target.value);
            }}
          >
            <option value="" disabled>
              เลือกโครงการ
            </option>
            {proposals.map((item) => (
              <option key={item.id} value={item.id}>
                {item.documentNumber || item.id} · {item.customer}
              </option>
            ))}
          </select>
        </label>
        <label className="template-upload-label">
          <Upload size={16} />
          {busy ? "กำลังแนบต้นแบบ…" : "แนบชุดต้นแบบจัดจ้าง"}
          <input
            type="file"
            multiple
            accept=".doc,.docx"
            aria-label="แนบชุดต้นแบบจัดจ้าง"
            disabled={busy}
            onChange={(event) => {
              void attach(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
        </label>
        <span className="reference-count">
          ต้นแบบ {Object.keys(references).length} / 11 ไฟล์
        </span>
      </section>
      <p className="document-review-notice">
        สร้าง Word ฉบับร่างจากต้นแบบ DOCX 10 แบบได้
        โดยเติมข้อมูลจากโครงการและตรวจข้อความก่อนดาวน์โหลด ไม่มีการลงนาม อนุมัติ
        หรือยืนยันผลตรวจรับอัตโนมัติ ต้นแบบเก็บเฉพาะเบราว์เซอร์และ URL นี้
        แยกจากข้อมูลโครงการบนเซิร์ฟเวอร์ หากเปลี่ยนเครื่องหรือ URL ต้องแนบใหม่
        ไฟล์ DOC รุ่นเก่าดาวน์โหลดเป็นต้นแบบอ้างอิงได้
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
      {proposal ? (
        <ProcurementProject
          key={proposal.id}
          proposal={proposal}
          company={company}
          references={references}
          busy={busy}
          onAttach={(id, file) => void attach([file], id)}
          onSave={onSave}
          onDirty={setDirty}
          onPreview={(id) => {
            const file = references[id];
            if (file)
              setPreview({
                title:
                  "ต้นแบบอ้างอิง: " +
                  procurementReferences.find((item) => item.id === id)?.title,
                buffer: file.buffer,
              });
          }}
        />
      ) : (
        <p className="panel">
          สร้างใบเสนอราคาหรือเลือกโครงการก่อนเริ่มชุดจัดจ้าง
        </p>
      )}
      <p className="field-hint">
        ไฟล์สำรอง JSON รวมข้อมูลจัดจ้างและสถานะเอกสาร แต่ไม่รวมต้นแบบ Word
        เก็บต้นฉบับแยกไว้ด้วย การแนบไฟล์ไม่เปลี่ยนสถานะเป็นตรวจทานแล้ว
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
function ProcurementProject({
  proposal,
  company,
  references,
  busy,
  onAttach,
  onSave,
  onDirty,
  onPreview,
}: {
  proposal: Proposal;
  company: Company;
  references: StoredReferences;
  busy: boolean;
  onAttach: (id: ProcurementDocumentId, file: File) => void;
  onSave: SaveProcurement;
  onDirty: (dirty: boolean) => void;
  onPreview: (id: ProcurementDocumentId) => void;
}) {
  const current = JSON.stringify(proposal.procurement || defaultProcurement());
  const [base, setBase] = useState(current);
  const [draft, setDraft] = useState(
    () => proposal.procurement || defaultProcurement(),
  );
  const [activeStage, setActiveStage] = useState<ProcurementStage>("customer");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [draftDocument, setDraftDocument] = useState<ProcurementDocumentId>();
  const fileInputs = useRef<
    Partial<Record<ProcurementDocumentId, HTMLInputElement | null>>
  >({});
  const dirty = JSON.stringify(draft) !== base;
  const conflict = current !== base;
  useEffect(() => {
    onDirty(dirty || !!draftDocument);
  }, [dirty, draftDocument, onDirty]);
  useEffect(() => {
    if (!dirty && current !== base) {
      setDraft(JSON.parse(current) as Procurement);
      setBase(current);
    }
  }, [current, base, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function update(next: Procurement) {
    setDraft(next);
    setSaved(false);
    setError("");
  }
  const warnings = procurementWarnings(draft);
  const reviewed = procurementReferences.filter(
    (item) => draft.documents[item.id]?.state === "ตรวจทานแล้ว",
  ).length;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!isProcurement(draft)) {
          setError(
            "ข้อมูลไม่ถูกต้อง ตรวจวันที่เริ่ม/ส่งมอบ ตัวเลข และวันที่เอกสาร",
          );
          return;
        }
        if (conflict) {
          setError(
            "ข้อมูลโครงการเปลี่ยนจากแท็บอื่น กรุณาสำรองร่างและโหลดใหม่ ไม่ได้เขียนทับข้อมูลล่าสุด",
          );
          return;
        }
        if (await onSave(proposal.id, draft, base)) {
          setBase(JSON.stringify(draft));
          setSaved(true);
          setError("");
        } else setError("บันทึกไม่สำเร็จ กรุณาตรวจข้อความสถานะข้อมูลด้านบน");
      }}
    >
      <section className="panel procurement-context">
        <div>
          <span className="eyebrow">ฝั่งลูกค้า / สัญญาหลัก</span>
          <h2>{proposal.customer}</h2>
          <p>
            {proposal.system} kWp · {proposal.location}
          </p>
          <strong>ยอดขายให้ลูกค้า {money(proposal.amount)}</strong>
        </div>
        <div>
          <span className="eyebrow">ฝั่งจัดจ้าง</span>
          <h2>{draft.contractorName || "ยังไม่ระบุผู้รับจ้าง"}</h2>
          <p>ข้อมูลสองฝ่ายแยกกัน ไม่ใช้ยอดขายเป็นต้นทุนจ้าง</p>
          <strong>ราคาตกลงจ้าง {money(draft.agreedGross)}</strong>
        </div>
      </section>
      <div className="procurement-progress">
        <strong>ตรวจทานภายใน {reviewed} / 11 เอกสาร</strong>
        <span>ไม่ใช่สถานะลงนามหรืออนุมัติทางกฎหมาย</span>
        <progress
          aria-label="เอกสารที่บันทึกว่าตรวจทานแล้ว"
          max={11}
          value={reviewed}
        />
      </div>
      <section className="panel procurement-data">
        <div className="panel-head">
          <div>
            <h2>ข้อมูลกลางงานจัดจ้าง</h2>
            <p>เริ่มว่าง ไม่คัดชื่อหรือราคาในต้นแบบมากรอก</p>
          </div>
        </div>
        <ProcurementEditor value={draft} onChange={update} />
      </section>
      {warnings.length > 0 && (
        <section className="document-checklist procurement-checklist">
          <strong>รายการที่ควรตรวจทาน</strong>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
      <div className="procurement-stage-index">
        {procurementStages.map((stage, index) => (
          <button
            type="button"
            key={stage.id}
            aria-pressed={stage.id === activeStage}
            onClick={() => setActiveStage(stage.id)}
          >
            <span>{index + 1}</span>
            {stage.title}
          </button>
        ))}
      </div>
      {procurementStages
        .filter((stage) => stage.id === activeStage)
        .map((stage) => (
          <section
            id={`procurement-${stage.id}`}
            className="procurement-stage"
            key={stage.id}
          >
            <div className="stage-heading">
              <h2>{stage.title}</h2>
              <p>{stage.description}</p>
            </div>
            <div className="procurement-document-grid">
              {procurementReferences
                .filter((item) => item.stage === stage.id)
                .map((template) => {
                  const item =
                    draft.documents[template.id] || defaultProcurementDocument;
                  const attached = references[template.id];
                  return (
                    <article
                      className="panel procurement-document-card"
                      key={template.id}
                    >
                      <div className="procurement-document-heading">
                        <span className="document-order">
                          {template.number}
                        </span>
                        <div>
                          <h3>{template.title}</h3>
                          <span
                            className={`document-state ${item.state === "ตรวจทานแล้ว" ? "reviewed" : ""}`}
                          >
                            {item.state}
                          </span>
                        </div>
                      </div>
                      <p className="reference-status">
                        {attached
                          ? attached.sessionOnly
                            ? "ต้นแบบพร้อมใช้ในแท็บนี้ · รีเฟรชแล้วต้องแนบใหม่"
                            : "ต้นแบบแนบแล้ว · เก็บในเบราว์เซอร์นี้"
                          : "ยังไม่ได้แนบต้นแบบ"}
                        {!template.previewable && " · DOC รุ่นเก่า"}
                      </p>
                      {attached && (
                        <p className="template-filename">{attached.filename}</p>
                      )}
                      <p className="field-hint">{template.note}</p>
                      <details className="reference-fields">
                        <summary>
                          <FileText size={14} />
                          ข้อมูลที่ใช้กับฟอร์มนี้
                          <ChevronDown size={14} />
                        </summary>
                        <ul>
                          {template.fields.map((field) => (
                            <li key={field}>{field}</li>
                          ))}
                        </ul>
                      </details>
                      <div className="editor-form form-grid">
                        <label className="field">
                          เลขที่ {template.number}
                          <input
                            aria-label={`เลขอ้างอิง ${template.title}`}
                            maxLength={200}
                            value={item.reference}
                            onChange={(event) =>
                              update({
                                ...draft,
                                documents: {
                                  ...draft.documents,
                                  [template.id]: {
                                    ...item,
                                    reference: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </label>
                        <label className="field">
                          วันที่เอกสาร
                          <input
                            aria-label={`วันที่ ${template.title}`}
                            type="date"
                            min="1900-01-01"
                            max="2199-12-31"
                            value={item.date}
                            onChange={(event) =>
                              update({
                                ...draft,
                                documents: {
                                  ...draft.documents,
                                  [template.id]: {
                                    ...item,
                                    date: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </label>
                        <label className="field field-full">
                          สถานะตรวจทาน
                          <select
                            aria-label={`สถานะ ${template.title}`}
                            value={item.state}
                            onChange={(event) =>
                              update({
                                ...draft,
                                documents: {
                                  ...draft.documents,
                                  [template.id]: {
                                    ...item,
                                    state: event.target
                                      .value as typeof item.state,
                                  },
                                },
                              })
                            }
                          >
                            {documentStates.map((state) => (
                              <option key={state}>{state}</option>
                            ))}
                          </select>
                        </label>
                        <label className="field field-full">
                          หมายเหตุ / สิ่งที่ต้องแก้
                          <input
                            aria-label={`หมายเหตุ ${template.title}`}
                            maxLength={1000}
                            value={item.notes}
                            onChange={(event) =>
                              update({
                                ...draft,
                                documents: {
                                  ...draft.documents,
                                  [template.id]: {
                                    ...item,
                                    notes: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </label>
                      </div>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!attached || !template.previewable}
                        onClick={() => onPreview(template.id)}
                      >
                        <Eye size={15} />
                        {template.previewable
                          ? "ดูต้นแบบอ้างอิง"
                          : "ต้องแปลงเป็น DOCX ก่อน"}
                      </button>
                      <label className="template-upload-label">
                        <Upload size={15} />
                        {attached ? "เปลี่ยนต้นแบบ" : "แนบต้นแบบ"}{" "}
                        {template.format.toUpperCase()}
                        <input
                          type="file"
                          accept={`.${template.format}`}
                          aria-label={`แนบต้นแบบ ${template.title}`}
                          disabled={busy}
                          ref={(node) => {
                            fileInputs.current[template.id] = node;
                          }}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) onAttach(template.id, file);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          busy ||
                          (!!attached &&
                            template.previewable &&
                            (dirty || conflict))
                        }
                        onClick={() => {
                          if (!attached) {
                            fileInputs.current[template.id]?.click();
                            return;
                          }
                          if (template.previewable)
                            setDraftDocument(template.id);
                          else
                            try {
                              downloadBlob(
                                new Blob([attached.buffer], {
                                  type: "application/msword",
                                }),
                                `ต้นแบบอ้างอิง_${attached.filename}`,
                              );
                            } catch {
                              setError(
                                "เบราว์เซอร์ไม่รับคำสั่งดาวน์โหลด กรุณาลองใหม่",
                              );
                            }
                        }}
                      >
                        <Download size={15} />
                        {!attached
                          ? "แนบต้นแบบเพื่อดาวน์โหลด"
                          : template.previewable
                            ? "เตรียม Word ฉบับร่าง"
                            : "ดาวน์โหลดต้นแบบ DOC อ้างอิง"}
                      </button>
                      {attached &&
                        template.previewable &&
                        (dirty || conflict) && (
                          <p className="field-hint">
                            บันทึกข้อมูลชุดจัดจ้างก่อนเปิดร่าง Word
                            เพื่อใช้ข้อมูลล่าสุด
                          </p>
                        )}
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      <div className="procurement-save-bar">
        <span role="status">
          {conflict
            ? "มีข้อมูลใหม่จากแท็บอื่น ไม่สามารถเขียนทับได้"
            : saved
              ? "บันทึกชุดจัดจ้างแล้ว"
              : dirty
                ? "มีการแก้ไขที่ยังไม่บันทึก — บันทึกก่อนเปลี่ยนหน้า"
                : "ข้อมูลที่บันทึกไว้"}
        </span>
        <button type="submit" className="primary-button" disabled={conflict}>
          <Save size={16} />
          บันทึกชุดจัดจ้าง
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {draftDocument && references[draftDocument] && (
        <ProcurementDocumentDraft
          id={draftDocument}
          proposal={proposal}
          company={company}
          file={references[draftDocument]!}
          onClose={() => setDraftDocument(undefined)}
        />
      )}
    </form>
  );
}
