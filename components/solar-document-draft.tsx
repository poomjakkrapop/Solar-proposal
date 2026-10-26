"use client";
import { useState } from "react";
import {
  prepareSolarDraft,
  safeDraftFilename,
  solarDraftFields,
} from "../lib/document-draft";
import { documentReadiness } from "../lib/document-data";
import { generateDocx } from "../lib/template-engine";
import type { PrivateFile } from "../lib/private-files";
import type { TemplateId } from "../lib/template-maps";
import type { Company, Proposal } from "../lib/workspace";
import { WordDraftDialog } from "./word-draft-dialog";

export function SolarDocumentDraft({
  id,
  title,
  proposal,
  company,
  file,
  onClose,
}: {
  id: TemplateId;
  title: string;
  proposal: Proposal;
  company: Company;
  file: PrivateFile;
  onClose: () => void;
}) {
  const [initial] = useState(() => prepareSolarDraft(proposal, company, id));
  return (
    <WordDraftDialog
      title={title}
      reference={`${proposal.documentNumber || proposal.id} · ${proposal.customer}`}
      fingerprint={JSON.stringify({
        proposal,
        company,
        source: file.attachedAt,
      })}
      initialValues={initial.values}
      fields={initial.missing.length ? [] : solarDraftFields(id)}
      missing={[
        ...initial.missing,
        ...documentReadiness(proposal, company, id),
      ]}
      filename={safeDraftFilename(proposal.documentNumber || proposal.id, id)}
      generate={(values) => generateDocx(file.buffer, id, values)}
      notice="ใช้ต้นแบบส่วนตัวของระบบ ตรวจข้อมูลทั้งสองฝ่าย ยอดเงิน รายการอุปกรณ์ ผู้ลงนาม และเงื่อนไขทุกครั้ง เอกสารเป็นฉบับร่าง ไม่มีการลงนามหรืออนุมัติจากระบบ ภาพตัวอย่างใช้ตรวจเนื้อหา ต้องตรวจการแบ่งหน้าใน Microsoft Word ก่อนออกเอกสารจริง"
      onClose={onClose}
    />
  );
}
