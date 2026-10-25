"use client";
import { useState } from "react";
import {
  prepareProcurementDraft,
  procurementDocumentReadiness,
} from "../lib/procurement-document-data";
import { procurementReferences } from "../lib/procurement-catalog";
import { procurementTemplateMaps } from "../lib/procurement-template-maps";
import { safeDraftFilename } from "../lib/document-draft";
import { generateMappedDocx } from "../lib/template-engine";
import type { ProcurementDocumentId } from "../lib/procurement";
import type { PrivateFile } from "../lib/private-files";
import type { Company, Proposal } from "../lib/workspace";
import { WordDraftDialog } from "./word-draft-dialog";

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
  const [prepared] = useState(() =>
    prepareProcurementDraft(proposal, company, id),
  );
  const initial = prepared.values;
  const metadata = procurementReferences.find((item) => item.id === id)!;
  const fields = Object.entries(initial)
    .filter(
      ([, value]) =>
        !!value &&
        !value.includes("ยังไม่ได้ลงนาม") &&
        !value.includes("ยังไม่มีผลอนุมัติ") &&
        !/^\([.]+\)$/.test(value) &&
        !value.startsWith("ที่ ................................"),
    )
    .map(([key, seed], index) => ({
      key,
      label: `${index + 1}. ${seed.startsWith("[รอกรอก:") ? seed.replace(/^\[รอกรอก:\s*/, "").replace(/\]$/, "") : seed.slice(0, 90) + (seed.length > 90 ? "…" : "")}`,
    }));
  return (
    <WordDraftDialog
      title={metadata.title}
      reference={`${proposal.documentNumber || proposal.id} · ${proposal.customer}`}
      fingerprint={JSON.stringify({
        proposal,
        company,
        source: file.attachedAt,
      })}
      initialValues={initial}
      fields={fields}
      missing={[
        ...prepared.errors,
        ...procurementDocumentReadiness(proposal, company, id),
      ]}
      filename={safeDraftFilename(
        proposal.documentNumber || proposal.id,
        `${metadata.number}_${id}`,
      )}
      generate={(values) => {
        const map = procurementTemplateMaps.find((item) => item.id === id);
        if (!map)
          return Promise.reject(new Error("ยังไม่มีการตั้งค่าต้นแบบนี้"));
        return generateMappedDocx(file.buffer, map, values);
      }}
      notice="ใช้รูปแบบจากต้นฉบับที่แนบ ข้อมูลตัวอย่างและข้อความอนุมัติเดิมถูกแทนที่ ช่อง [รอกรอก: …] และข้อสัญญาที่เหลือต้องตรวจให้ตรงงานจริง เอกสารนี้ไม่มีลายเซ็นหรือผลอนุมัติจากระบบ"
      onClose={onClose}
    />
  );
}
