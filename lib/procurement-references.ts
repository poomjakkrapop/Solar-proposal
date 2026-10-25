import { procurementReferences } from "./procurement-catalog";
import { digestFile, readPrivateFile, savePrivateFile } from "./private-files";
import type { ProcurementDocumentId } from "./procurement";
export const referenceKey = (id: ProcurementDocumentId) =>
  `procurement:${id}` as const;
export const getProcurementReference = (id: ProcurementDocumentId) =>
  readPrivateFile(referenceKey(id));
export async function attachProcurementReference(file: File) {
  if (file.size > 10 * 1024 * 1024 || !/\.docx?$/i.test(file.name))
    throw new Error("เลือกไฟล์ DOC/DOCX ขนาดไม่เกิน 10 MB ต่อไฟล์");
  const buffer = await file.arrayBuffer();
  const hash = await digestFile(buffer);
  const template = procurementReferences.find((entry) => entry.sha256 === hash);
  if (!template)
    throw new Error(
      `${file.name}: ไม่ตรงกับต้นแบบจัดจ้างที่ตรวจไว้ จึงไม่ได้บันทึก`,
    );
  const stored = await savePrivateFile(
    referenceKey(template.id),
    file.name,
    buffer,
    hash,
  );
  return { id: template.id, stored };
}
