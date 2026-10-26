import { validateWorkspace, type Workspace } from "./workspace.ts";

export const MAX_CLOUD_BYTES = 4 * 1024 * 1024;
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type CloudRole = "owner" | "editor" | "viewer";
export type CloudWorkspace = {
  id: string;
  revision: number;
  role: CloudRole;
  document: Workspace;
};
export class CloudError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function checkOrigin(request: Request) {
  const url = new URL(request.url);
  // Next may use an internal hostname in request.url; Host is the browser's destination.
  // Do not trust X-Forwarded-Host or allow arbitrary subdomains as origins.
  const host = request.headers.get("host") || url.host;
  const protocol =
    request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1);
  const expected = `${protocol}://${host}`;
  if (
    !["http", "https"].includes(protocol) ||
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new CloudError(403, "คำขอมาจากเว็บไซต์ที่ไม่ได้รับอนุญาต");
}
export async function readJson(
  request: Request,
  limit = MAX_CLOUD_BYTES,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new CloudError(415, "ต้องส่งข้อมูลเป็น JSON");
  if (Number(request.headers.get("content-length")) > limit)
    throw new CloudError(413, "ข้อมูลมีขนาดใหญ่เกินกำหนด");
  if (!request.body) throw new CloudError(400, "ไม่พบข้อมูล");
  const reader = request.body.getReader();
  let total = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new CloudError(413, "ข้อมูลมีขนาดใหญ่เกินกำหนด");
      }
      parts.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new CloudError(400, "JSON ไม่ถูกต้อง");
  }
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function validateCloudSave(value: unknown) {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !uuidPattern.test(value.id) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1
  )
    throw new CloudError(400, "รหัสพื้นที่ทำงานหรือ revision ไม่ถูกต้อง");
  try {
    const document = validateWorkspace(value.document);
    if (document.proposals.length > 10000 || document.customers.length > 10000)
      throw new Error("จำนวนรายการเกินขอบเขตที่รองรับ");
    return { id: value.id, revision: Number(value.revision), document };
  } catch {
    throw new CloudError(
      422,
      "ข้อมูลพื้นที่ทำงานไม่ถูกต้อง กรุณาตรวจไฟล์และเลขเอกสารซ้ำ",
    );
  }
}
export function parseCloudWorkspace(value: unknown): CloudWorkspace {
  if (
    !record(value) ||
    !["owner", "editor", "viewer"].includes(String(value.role))
  )
    throw new CloudError(502, "เซิร์ฟเวอร์ส่งสิทธิ์ที่ไม่ถูกต้อง");
  const parsed = validateCloudSave({
    ...value,
    revision: Number(value.revision),
  });
  return { ...parsed, role: value.role as CloudRole };
}
