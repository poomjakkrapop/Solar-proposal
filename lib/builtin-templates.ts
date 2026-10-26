import { builtinTemplateCatalog } from "./builtin-template-catalog.ts";
import { digestFile, type PrivateFile } from "./private-files.ts";

type BuiltinAsset = {
  id: string;
  key: string;
  filename: string;
  sha256: string;
  sourceSha256: string;
};
type AssetFetch = (url: string, options?: RequestInit) => Promise<Response>;
export type BuiltinTemplate<T extends string = string> = PrivateFile<T> & {
  source: "builtin";
  version: string;
};
const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;

// Cache only verified bytes and never expose their mutable ArrayBuffer directly.
// A failed request is evicted, so a retry can recover without resetting site data.
export function createBuiltinTemplateLoader(
  catalog: readonly BuiltinAsset[] = builtinTemplateCatalog,
  fetchAsset: AssetFetch = (url, options) => fetch(url, options),
) {
  const pending = new Map<string, Promise<BuiltinTemplate>>();
  return async function load<T extends string>(
    key: T,
  ): Promise<BuiltinTemplate<T>> {
    const entry = catalog.find((item) => item.key === key);
    if (
      !entry ||
      !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.docx$/.test(entry.filename) ||
      !HASH.test(entry.sha256) ||
      !HASH.test(entry.sourceSha256)
    )
      throw new Error("ไม่พบต้นแบบของระบบสำหรับเอกสารนี้");
    let request = pending.get(key);
    if (!request) {
      request = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetchAsset(
            `/api/document-templates/${entry.id}`,
            {
              cache: "no-store",
              credentials: "same-origin",
              signal: controller.signal,
            },
          );
          if (response.status === 401)
            throw new Error("กรุณาเข้าสู่ระบบ SolarDesk เพื่อใช้ต้นแบบส่วนตัว");
          if (response.status === 403)
            throw new Error("บัญชีนี้ยังไม่มีสิทธิ์ใช้ต้นแบบของ SolarDesk");
          if (!response.ok)
            throw new Error("โหลดต้นแบบของระบบไม่สำเร็จ กรุณาลองใหม่");
          const declaredSize = Number(response.headers.get("content-length"));
          if (
            Number.isFinite(declaredSize) &&
            declaredSize > MAX_TEMPLATE_BYTES
          )
            throw new Error("ขนาดต้นแบบของระบบเกินขอบเขตที่รองรับ");
          const buffer = await response.arrayBuffer();
          if (!buffer.byteLength || buffer.byteLength > MAX_TEMPLATE_BYTES)
            throw new Error(
              "ข้อมูลต้นแบบของระบบไม่ครบถ้วนหรือมีขนาดไม่ถูกต้อง",
            );
          if ((await digestFile(buffer)) !== entry.sha256)
            throw new Error(
              "ตรวจสอบต้นแบบของระบบไม่ผ่าน กรุณากดลองใหม่เพื่อโหลดต้นแบบอีกครั้ง",
            );
          return {
            id: entry.key,
            filename: entry.filename,
            buffer,
            attachedAt: new Date().toISOString(),
            source: "builtin" as const,
            version: entry.sha256,
          };
        } catch (error) {
          if (controller.signal.aborted)
            throw new Error(
              "โหลดต้นแบบของระบบนานเกินไป กรุณาตรวจการเชื่อมต่อแล้วลองใหม่",
            );
          if (error instanceof TypeError)
            throw new Error(
              "เชื่อมต่อเพื่อโหลดต้นแบบของระบบไม่สำเร็จ กรุณาลองใหม่",
            );
          throw error;
        } finally {
          clearTimeout(timeout);
        }
      })();
      pending.set(key, request);
    }
    try {
      const file = await request;
      return { ...file, id: key, buffer: file.buffer.slice(0) };
    } catch (error) {
      // Do not let an obsolete failure remove a newer retry's promise.
      if (pending.get(key) === request) pending.delete(key);
      throw error;
    }
  };
}

export const loadBuiltinTemplate = createBuiltinTemplateLoader();

export function isReviewedTemplateHash(
  sourceSha256: string,
  actualSha256: string,
) {
  if (!HASH.test(sourceSha256) || !HASH.test(actualSha256)) return false;
  return (
    sourceSha256 === actualSha256 ||
    builtinTemplateCatalog.some(
      (entry) =>
        entry.sourceSha256 === sourceSha256 && entry.sha256 === actualSha256,
    )
  );
}
