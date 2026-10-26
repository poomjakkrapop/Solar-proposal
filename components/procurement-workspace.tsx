"use client";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Download,
  Eye,
  FileText,
  Save,
  RotateCcw,
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
  getProcurementReference,
  loadProcurementReferences,
  type StoredProcurementReference,
} from "../lib/procurement-references";
import { money, type Company, type Proposal } from "../lib/workspace";
import { readPrivateFile } from "../lib/private-files";
import { procurementDocumentReadiness } from "../lib/procurement-document-data";
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
  const selectedId = proposals.some((item) => item.id === selected)
    ? selected
    : proposals[0]?.id || "";
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  const [references, setReferences] = useState<StoredReferences>({});
  const [busy, setBusy] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    title: string;
    buffer: ArrayBuffer;
  }>();
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    loadProcurementReferences()
      .then(({ files, errors }) => {
        if (!active) return;
        setReferences((current) => ({ ...current, ...files }));
        setError(
          errors.some((message) => message.includes("เข้าสู่ระบบ"))
            ? "กรุณาเข้าสู่ระบบ SolarDesk เพื่อโหลดต้นแบบส่วนกลาง"
            : errors.some((message) => message.includes("ไม่มีสิทธิ์"))
              ? "บัญชีนี้ยังไม่มีสิทธิ์ใช้ต้นแบบส่วนกลางของ SolarDesk"
              : errors.join(" · "),
        );
      })
      .catch(() => {
        if (active)
          setError(
            "โหลดต้นแบบระบบไม่สำเร็จ ตรวจการเชื่อมต่อแล้วกดโหลดอีกครั้ง",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);
  const proposal = proposals.find((item) => item.id === selectedId);
  return (
    <div className="procurement-workspace">
      <section className="panel document-selection">
        <label className="field">
          เลือกโครงการสำหรับชุดจัดจ้าง
          <select
            value={selectedId}
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
        <span className="reference-count">
          ต้นแบบระบบพร้อมใช้{" "}
          {
            Object.values(references).filter((file) => file?.format === "docx")
              .length
          }{" "}
          / 11 แบบ
        </span>
      </section>
      <p className="document-review-notice">
        ระบบโหลดต้นแบบส่วนกลางครบ 11 แบบ
        หลังเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ใช้งาน ไม่ต้องแนบไฟล์
        เติมข้อมูลจากข้อเสนอ หน่วยงาน และชุดจัดจ้างที่บันทึกไว้
        แล้วตรวจร่างก่อนดาวน์โหลด ไม่มีการลงนาม อนุมัติ
        หรือยืนยันผลตรวจรับอัตโนมัติ
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {error.includes("เข้าสู่ระบบ") && (
        <p>
          <a href="/login">เข้าสู่ระบบอีกครั้งเพื่อโหลดต้นแบบส่วนกลาง</a>
        </p>
      )}
      {busy && (
        <p className="field-hint" role="status">
          กำลังโหลดต้นแบบระบบ… กรอกข้อมูลโครงการระหว่างรอได้
        </p>
      )}
      {error && (
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
        >
          <RotateCcw size={16} />
          โหลดต้นแบบอีกครั้ง
        </button>
      )}
      {proposal ? (
        <ProcurementProject
          key={proposal.id}
          proposal={proposal}
          company={company}
          references={references}
          busy={busy}
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
        ไฟล์สำรอง JSON รวมข้อมูลจัดจ้างและสถานะเอกสารตามเดิม
        ต้นแบบส่วนกลางโหลดให้อัตโนมัติเมื่อล็อกอินด้วยบัญชีที่มีสิทธิ์บนเครื่องใหม่
        ข้อความที่ปรับเฉพาะในร่างไม่บันทึกกลับข้อมูลกลาง
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
  onSave,
  onDirty,
  onPreview,
}: {
  proposal: Proposal;
  company: Company;
  references: StoredReferences;
  busy: boolean;
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
  const [legacyNotice, setLegacyNotice] = useState("");
  const [legacyBusy, setLegacyBusy] = useState(false);
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
  async function downloadLegacyReference() {
    setLegacyBusy(true);
    setLegacyNotice("");
    try {
      const stored = await getProcurementReference(
        "supervision",
        readPrivateFile,
      );
      const legacy = stored?.format === "doc" ? stored : stored?.legacy;
      if (!legacy) {
        setLegacyNotice(
          "ไม่พบ DOC อ้างอิงเดิมในเบราว์เซอร์นี้ ใช้ต้นแบบระบบสร้างร่างได้ตามปกติ",
        );
        return;
      }
      downloadBlob(
        new Blob([legacy.buffer], { type: "application/msword" }),
        `ต้นแบบอ้างอิง_${legacy.filename}`,
      );
      setLegacyNotice("ส่ง DOC อ้างอิงเดิมให้เบราว์เซอร์แล้ว");
    } catch {
      setLegacyNotice(
        "อ่าน DOC อ้างอิงเดิมไม่สำเร็จ ข้อมูลเดิมยังอยู่ ใช้ต้นแบบระบบสร้างร่างได้ตามปกติ",
      );
    } finally {
      setLegacyBusy(false);
    }
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
                  const draftable = attached?.format === "docx";
                  const missing = procurementDocumentReadiness(
                    { ...proposal, procurement: draft },
                    company,
                    template.id,
                  );
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
                        {draftable
                          ? "ต้นแบบระบบพร้อมใช้"
                          : busy
                            ? "กำลังโหลดต้นแบบระบบ…"
                            : "โหลดต้นแบบยังไม่สำเร็จ กดโหลดต้นแบบอีกครั้งด้านบน"}
                      </p>
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
                      {missing.length > 0 && (
                        <div className="document-checklist">
                          <strong>ข้อมูลที่ต้องเติมก่อนสร้างเอกสาร</strong>
                          <ul>
                            {missing.map((field) => (
                              <li key={field}>{field}</li>
                            ))}
                          </ul>
                          <p className="field-hint">
                            เติมข้อมูลกลางและเลขอ้างอิงของเอกสาร
                            แล้วกดบันทึกชุดจัดจ้าง
                            ข้อมูลหน่วยงานแก้ได้ในเมนูตั้งค่าบริษัท
                          </p>
                        </div>
                      )}
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!draftable}
                        onClick={() => onPreview(template.id)}
                      >
                        <Eye size={15} />
                        ดูต้นแบบระบบ
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          !draftable || dirty || conflict || !!missing.length
                        }
                        onClick={() => {
                          if (!draftable || dirty || conflict || missing.length)
                            return;
                          setDraftDocument(template.id);
                        }}
                      >
                        <Download size={15} />
                        {!draftable
                          ? busy
                            ? "กำลังโหลดต้นแบบ…"
                            : "รอโหลดต้นแบบระบบ"
                          : "เตรียม Word ฉบับร่าง"}
                      </button>
                      {template.id === "supervision" && (
                        <details className="reference-fields">
                          <summary>DOC อ้างอิงเดิมในเครื่อง (ถ้ามี)</summary>
                          <p className="field-hint">
                            ไฟล์เดิมเก็บแยกจากต้นแบบระบบ
                            ใช้สำหรับอ้างอิงเท่านั้น
                          </p>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={legacyBusy}
                            onClick={() => void downloadLegacyReference()}
                          >
                            <Download size={15} />
                            {legacyBusy
                              ? "กำลังอ่าน DOC เดิม…"
                              : "ดาวน์โหลด DOC เดิมที่เคยเก็บไว้"}
                          </button>
                          {legacyNotice && (
                            <p className="field-hint" role="status">
                              {legacyNotice}
                            </p>
                          )}
                        </details>
                      )}
                      {attached && draftable && (dirty || conflict) && (
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
