import { procurementReferences } from "./procurement-catalog.ts";
import { loadBuiltinTemplate } from "./builtin-templates.ts";
import {
  digestFile,
  readPrivateFile,
  savePrivateFile,
  verifyPrivateFile,
  type PrivateFile,
} from "./private-files.ts";
import type { ProcurementDocumentId } from "./procurement.ts";
export type StoredProcurementReference = PrivateFile & {
  format: "doc" | "docx";
  sessionOnly?: boolean;
  legacy?: PrivateFile;
  source?: "builtin";
  version?: string;
};
// The existing legacy key is never overwritten by a converted template.
export const legacyReferenceKey = (id: ProcurementDocumentId) =>
  `procurement:${id}` as const;
export const referenceKey = (id: ProcurementDocumentId) => {
  const reference = procurementReferences.find((item) => item.id === id);
  return reference?.legacy ? `procurement:${id}:docx` : legacyReferenceKey(id);
};
type PrivateReader = (
  id: string,
  hash: string,
) => Promise<PrivateFile | undefined>;
export async function getProcurementReference(
  id: ProcurementDocumentId,
  read?: PrivateReader,
): Promise<StoredProcurementReference | undefined> {
  const reference = procurementReferences.find((item) => item.id === id);
  if (!reference) throw new Error("ไม่พบประเภทต้นแบบจัดจ้าง");
  if (!read) {
    const file = await loadBuiltinTemplate(referenceKey(id));
    return { ...file, format: "docx" };
  }
  const sources = [
    { key: referenceKey(id), hash: reference.sha256, format: "docx" as const },
    ...(reference.legacy
      ? [
          {
            key: legacyReferenceKey(id),
            hash: reference.legacy.sha256,
            format: "doc" as const,
          },
        ]
      : []),
  ];
  const results = await Promise.allSettled(
    sources.map((source) =>
      Promise.resolve().then(() => read(source.key, source.hash)),
    ),
  );
  const primary =
    results[0].status === "fulfilled" ? results[0].value : undefined;
  const legacy =
    results[1]?.status === "fulfilled" ? results[1].value : undefined;
  if (primary)
    return { ...primary, format: "docx", ...(legacy ? { legacy } : {}) };
  if (legacy) return { ...legacy, format: "doc" };
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  return undefined;
}
export const getPrivateProcurementReference = (id: ProcurementDocumentId) =>
  getProcurementReference(id, readPrivateFile);
export function mergeProcurementReference(
  previous: StoredProcurementReference | undefined,
  incoming: StoredProcurementReference,
): StoredProcurementReference {
  if (incoming.format === "doc")
    return previous?.format === "docx"
      ? { ...previous, legacy: incoming }
      : incoming;
  const legacy =
    previous?.format === "doc" ? previous : previous?.legacy || incoming.legacy;
  return { ...incoming, ...(legacy ? { legacy } : {}) };
}
export async function loadProcurementReferences(
  read = (id: ProcurementDocumentId) => getProcurementReference(id),
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
    } else {
      // Only the loader's controlled access messages may reach the sign-in UI.
      // Unknown provider/cache errors remain generic and cannot leak details.
      const reason =
        result.reason instanceof Error &&
        [
          "กรุณาเข้าสู่ระบบ SolarDesk เพื่อใช้ต้นแบบส่วนตัว",
          "บัญชีนี้ยังไม่มีสิทธิ์ใช้ต้นแบบของ SolarDesk",
        ].includes(result.reason.message)
          ? result.reason.message
          : "โหลดต้นแบบของระบบไม่สำเร็จ กรุณาลองใหม่";
      errors.push(`${procurementReferences[i].title}: ${reason}`);
    }
  });
  return { files, errors };
}
export function resolveProcurementSource(hash: string) {
  for (const template of procurementReferences) {
    if (template.sha256 === hash)
      return {
        id: template.id,
        key: referenceKey(template.id),
        format: "docx" as const,
        hash,
      };
    if (template.legacy?.sha256 === hash)
      return {
        id: template.id,
        key: legacyReferenceKey(template.id),
        format: "doc" as const,
        hash,
      };
  }
  return undefined;
}
export async function attachProcurementReference(
  file: File,
  expectedId?: ProcurementDocumentId,
  persist = savePrivateFile,
) {
  if (file.size > 10 * 1024 * 1024 || !/\.docx?$/i.test(file.name))
    throw new Error("เลือกไฟล์ DOC/DOCX ขนาดไม่เกิน 10 MB ต่อไฟล์");
  const buffer = await file.arrayBuffer();
  const source = resolveProcurementSource(await digestFile(buffer));
  if (!source)
    throw new Error(
      `${file.name}: ไม่ตรงกับต้นแบบจัดจ้างที่ตรวจไว้ จึงไม่ได้บันทึก`,
    );
  if (expectedId && source.id !== expectedId)
    throw new Error("ไฟล์นี้เป็นต้นแบบคนละประเภท กรุณาแนบให้ตรงกับการ์ดเอกสาร");
  const selected = {
    id: source.key,
    filename: file.name,
    buffer,
    attachedAt: new Date().toISOString(),
  };
  await verifyPrivateFile(selected, source.key, source.hash);
  let stored: StoredProcurementReference;
  try {
    stored = {
      ...(await persist(source.key, file.name, buffer, source.hash)),
      format: source.format,
    };
  } catch {
    stored = { ...selected, format: source.format, sessionOnly: true };
  }
  return { id: source.id, stored };
}
