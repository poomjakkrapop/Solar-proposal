import { procurementReferences } from "./procurement-catalog.ts";
import {
  digestFile,
  readPrivateFile,
  savePrivateFile,
  verifyPrivateFile,
  type PrivateFile,
} from "./private-files.ts";
import type { ProcurementDocumentId } from "./procurement.ts";
export type StoredProcurementReference = PrivateFile & {
  sessionOnly?: boolean;
};
export const referenceKey = (id: ProcurementDocumentId) =>
  `procurement:${id}` as const;
export const getProcurementReference = (id: ProcurementDocumentId) => {
  const reference = procurementReferences.find((entry) => entry.id === id);
  if (!reference) throw new Error("ไม่พบประเภทต้นแบบจัดจ้าง");
  return readPrivateFile(referenceKey(id), reference.sha256);
};
export async function loadProcurementReferences(
  read = getProcurementReference,
) {
  const results = await Promise.allSettled(
    procurementReferences.map((item) =>
      Promise.resolve().then(() => read(item.id)),
    ),
  );
  const files: Partial<
    Record<ProcurementDocumentId, StoredProcurementReference>
  > = {};
  const errors: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      if (result.value) files[procurementReferences[i].id] = result.value;
    } else
      errors.push(
        `${procurementReferences[i].title}: อ่านต้นแบบไม่สำเร็จ กรุณาแนบต้นฉบับใหม่`,
      );
  });
  return { files, errors };
}
export async function attachProcurementReference(
  file: File,
  expectedId?: ProcurementDocumentId,
  persist = savePrivateFile,
) {
  if (file.size > 10 * 1024 * 1024 || !/\.docx?$/i.test(file.name))
    throw new Error("เลือกไฟล์ DOC/DOCX ขนาดไม่เกิน 10 MB ต่อไฟล์");
  const buffer = await file.arrayBuffer();
  const hash = await digestFile(buffer);
  const template = procurementReferences.find((entry) => entry.sha256 === hash);
  if (!template)
    throw new Error(
      `${file.name}: ไม่ตรงกับต้นแบบจัดจ้างที่ตรวจไว้ จึงไม่ได้บันทึก`,
    );
  if (expectedId && template.id !== expectedId)
    throw new Error("ไฟล์นี้เป็นต้นแบบคนละประเภท กรุณาแนบให้ตรงกับการ์ดเอกสาร");
  const id = referenceKey(template.id);
  const selected = {
    id,
    filename: file.name,
    buffer,
    attachedAt: new Date().toISOString(),
  };
  await verifyPrivateFile(selected, id, template.sha256);
  let stored: StoredProcurementReference;
  try {
    stored = await persist(id, file.name, buffer, hash);
  } catch {
    stored = { ...selected, sessionOnly: true };
  }
  return { id: template.id, stored };
}
