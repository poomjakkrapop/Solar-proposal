import { createHash } from "node:crypto";
import { builtinTemplateCatalog } from "./builtin-template-catalog.ts";
import { CloudError, uuidPattern } from "./cloud-contract.ts";

export const MAX_DOCUMENT_TEMPLATE_BYTES = 10 * 1024 * 1024;
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const allowedRoles = new Set(["owner", "editor", "viewer"]);
const invalidBase64Character = /[^A-Za-z0-9+/=]/;

export type DocumentTemplateActor = { id: string; confirmed: boolean };
export type DocumentTemplateMembership = { role: string; active: boolean };
export type DocumentTemplateEntry = {
  id: string;
  filename: string;
  sha256: string;
};
export type DocumentTemplateOperations = {
  identity(): Promise<DocumentTemplateActor | null>;
  membership(
    actor: DocumentTemplateActor,
  ): Promise<DocumentTemplateMembership | undefined>;
  read(id: string): Promise<unknown>;
};

/** No template bytes or privileged provider client are requested until access is verified. */
export async function documentTemplateRequest(
  request: Request,
  id: string,
  operations: DocumentTemplateOperations,
  catalog: readonly DocumentTemplateEntry[] = builtinTemplateCatalog,
): Promise<Response> {
  if (request.method !== "GET") throw new CloudError(405, "ไม่รองรับคำขอนี้");
  const expected = catalog.find((entry) => entry.id === id);
  if (!expected) throw new CloudError(404, "ไม่พบประเภทต้นแบบเอกสาร");
  if (
    !/^[a-f0-9]{64}$/.test(expected.sha256) ||
    !/^[A-Za-z0-9._-]+\.docx$/.test(expected.filename)
  )
    throw new CloudError(503, "การตั้งค่าต้นแบบเอกสารไม่ถูกต้อง");

  const actor = await operations.identity();
  if (!actor || !uuidPattern.test(actor.id))
    throw new CloudError(401, "กรุณาเข้าสู่ระบบใหม่");
  if (actor.confirmed !== true)
    throw new CloudError(403, "กรุณายืนยันอีเมลก่อนใช้ต้นแบบเอกสาร");
  const membership = await operations.membership(actor);
  if (
    !membership ||
    membership.active !== true ||
    !allowedRoles.has(membership.role)
  )
    throw new CloudError(403, "บัญชีนี้ยังไม่มีสิทธิ์ใช้ต้นแบบ SolarDesk");

  const result = await operations.read(id);
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new CloudError(503, "ต้นแบบส่วนกลางยังไม่พร้อม กรุณาลองใหม่ภายหลัง");
  const row = result as Record<string, unknown>;
  const encoded = row.content_base64;
  if (
    row.id !== expected.id ||
    row.sha256 !== expected.sha256 ||
    typeof encoded !== "string" ||
    !encoded.length ||
    encoded.length > Math.ceil(MAX_DOCUMENT_TEMPLATE_BYTES / 3) * 4 ||
    encoded.length % 4 !== 0 ||
    invalidBase64Character.test(encoded)
  )
    throw new CloudError(
      503,
      "ต้นแบบส่วนกลางไม่ผ่านการตรวจสอบ กรุณาติดต่อผู้ดูแล",
    );
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const firstPadding = encoded.indexOf("=");
  if (
    (firstPadding !== -1 && firstPadding !== encoded.length - padding) ||
    (encoded.length / 4) * 3 - padding > MAX_DOCUMENT_TEMPLATE_BYTES
  )
    throw new CloudError(
      503,
      "ต้นแบบส่วนกลางไม่ผ่านการตรวจสอบ กรุณาติดต่อผู้ดูแล",
    );
  const bytes = Buffer.from(encoded, "base64");
  if (
    !bytes.length ||
    bytes.length > MAX_DOCUMENT_TEMPLATE_BYTES ||
    bytes.toString("base64") !== encoded ||
    createHash("sha256").update(bytes).digest("hex") !== expected.sha256
  )
    throw new CloudError(
      503,
      "ต้นแบบส่วนกลางไม่ผ่านการตรวจสอบ กรุณาติดต่อผู้ดูแล",
    );

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": DOCX,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${expected.filename}"`,
      "Cache-Control": "private, no-store",
      Pragma: "no-cache",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
