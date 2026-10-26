import { templateMaps, type TemplateId } from "./template-maps.ts";
import { loadBuiltinTemplate } from "./builtin-templates.ts";
import {
  readPrivateFile,
  savePrivateFile,
  verifyPrivateFile,
  type PrivateFile,
} from "./private-files.ts";
export type StoredTemplate = PrivateFile<TemplateId> & {
  sessionOnly?: boolean;
  source?: "builtin";
  version?: string;
};
type TemplateReader = (id: TemplateId) => Promise<StoredTemplate | undefined>;
type TemplateWriter = typeof savePrivateFile;
export const getTemplate = (id: TemplateId) => {
  if (!templateMaps.some((entry) => entry.id === id))
    throw new Error("ไม่พบประเภทต้นแบบ");
  return loadBuiltinTemplate(id);
};
// Retained for private-source inspection/compatibility; default generation no
// longer depends on IndexedDB or modifies any original attached by the user.
export const getPrivateTemplate = (id: TemplateId) => {
  const map = templateMaps.find((entry) => entry.id === id);
  if (!map) throw new Error("ไม่พบประเภทต้นแบบ");
  return readPrivateFile(id, map.sha256);
};
export async function loadTemplates(
  ids: readonly TemplateId[],
  read: TemplateReader = getTemplate,
) {
  const results = await Promise.allSettled(
    ids.map((id) => Promise.resolve().then(() => read(id))),
  );
  const files: Partial<Record<TemplateId, StoredTemplate>> = {};
  const errors: Partial<Record<TemplateId, string>> = {};
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      if (result.value) files[ids[i]] = result.value;
    } else
      errors[ids[i]] =
        result.reason instanceof Error
          ? result.reason.message
          : "โหลดต้นแบบของระบบไม่สำเร็จ กรุณาลองใหม่";
  });
  return { files, errors };
}
export async function attachTemplate(
  id: TemplateId,
  file: File,
  persist: TemplateWriter = savePrivateFile,
): Promise<StoredTemplate> {
  if (
    !file.name.toLowerCase().endsWith(".docx") ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("กรุณาเลือกไฟล์ DOCX ขนาดไม่เกิน 10 MB");
  const map = templateMaps.find((entry) => entry.id === id);
  if (!map) throw new Error("ไม่พบประเภทต้นแบบ");
  const buffer = await file.arrayBuffer();
  const selected = {
    id,
    filename: file.name,
    buffer,
    attachedAt: new Date().toISOString(),
  };
  return retainVerifiedTemplate(selected, map.sha256, persist);
}
export async function retainVerifiedTemplate(
  selected: PrivateFile<TemplateId>,
  expectedHash: string,
  persist: TemplateWriter = savePrivateFile,
): Promise<StoredTemplate> {
  // Storage fallback never bypasses validation of the selected original.
  await verifyPrivateFile(selected, selected.id, expectedHash);
  try {
    return await persist(
      selected.id,
      selected.filename,
      selected.buffer,
      expectedHash,
    );
  } catch {
    return { ...selected, sessionOnly: true };
  }
}
