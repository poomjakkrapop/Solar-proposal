import { templateMaps, type TemplateId } from "./template-maps";
import {
  readPrivateFile,
  savePrivateFile,
  type PrivateFile,
} from "./private-files";
export type StoredTemplate = PrivateFile<TemplateId>;
export const getTemplate = (id: TemplateId) => {
  const map = templateMaps.find((entry) => entry.id === id);
  if (!map) throw new Error("ไม่พบประเภทต้นแบบ");
  return readPrivateFile(id, map.sha256);
};
export async function attachTemplate(
  id: TemplateId,
  file: File,
): Promise<StoredTemplate> {
  if (
    !file.name.toLowerCase().endsWith(".docx") ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("กรุณาเลือกไฟล์ DOCX ขนาดไม่เกิน 10 MB");
  const map = templateMaps.find((entry) => entry.id === id);
  if (!map) throw new Error("ไม่พบประเภทต้นแบบ");
  return savePrivateFile(id, file.name, await file.arrayBuffer(), map.sha256);
}
