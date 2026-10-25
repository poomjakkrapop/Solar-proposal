import {
  CloudError,
  readJson,
  checkOrigin,
  record,
  uuidPattern,
  validateCloudSave,
  type CloudRole,
} from "./cloud-contract.ts";
import { defaultCompany } from "./workspace.ts";

export type CloudActor = { id: string; email?: string; confirmed: boolean };
export type CloudAccess = { id: string; role: CloudRole };
export type CloudOperations = {
  identity(): Promise<CloudActor>;
  access(actor: CloudActor, id: string): Promise<CloudAccess>;
  read(actor: CloudActor, id?: string): Promise<unknown>;
  save(
    actor: CloudActor,
    input: ReturnType<typeof validateCloudSave>,
  ): Promise<unknown>;
  create(actor: CloudActor, name: string, document: unknown): Promise<unknown>;
  team(actor: CloudActor, id: string): Promise<unknown>;
  invite(
    actor: CloudActor,
    id: string,
    email: string,
    role: "editor" | "viewer",
  ): Promise<unknown>;
  accept(actor: CloudActor, token: string): Promise<unknown>;
  setRole(
    actor: CloudActor,
    id: string,
    user: string,
    role: "editor" | "viewer",
    active: boolean,
  ): Promise<unknown>;
};
export async function workspaceRequest(
  request: Request,
  operations: CloudOperations,
): Promise<unknown> {
  if (request.method !== "GET") checkOrigin(request);
  const actor = await operations.identity();
  if (!actor.confirmed)
    throw new CloudError(403, "กรุณายืนยันอีเมลก่อนใช้พื้นที่ทำงาน");
  const url = new URL(request.url);
  if (request.method === "GET") {
    const id = url.searchParams.get("id") || undefined;
    if (id && !uuidPattern.test(id))
      throw new CloudError(400, "รหัสพื้นที่ทำงานไม่ถูกต้อง");
    if (id) await operations.access(actor, id);
    if (url.searchParams.get("team") === "true") {
      if (!id || (await operations.access(actor, id)).role !== "owner")
        throw new CloudError(403, "เฉพาะเจ้าของพื้นที่เท่านั้น");
      return operations.team(actor, id);
    }
    return operations.read(actor, id);
  }
  const input = await readJson(request);
  if (!record(input)) throw new CloudError(400, "ข้อมูลไม่ถูกต้อง");
  if (request.method === "PUT") {
    const parsed = validateCloudSave(input);
    const access = await operations.access(actor, parsed.id);
    if (access.role === "viewer")
      throw new CloudError(403, "บัญชีนี้มีสิทธิ์อ่านเท่านั้น");
    return operations.save(actor, parsed);
  }
  if (request.method !== "POST") throw new CloudError(405, "ไม่รองรับคำขอนี้");
  if (input.action === "create") {
    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 200
    )
      throw new CloudError(422, "ระบุชื่อพื้นที่ 1–200 ตัวอักษร");
    return operations.create(actor, input.name.trim(), {
      company: { ...defaultCompany, name: input.name.trim() },
      proposals: [],
      customers: [],
    });
  }
  if (input.action === "accept") {
    if (
      typeof input.token !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(input.token)
    )
      throw new CloudError(422, "รหัสเชิญไม่ถูกต้อง");
    return operations.accept(actor, input.token);
  }
  if (typeof input.id !== "string" || !uuidPattern.test(input.id))
    throw new CloudError(400, "รหัสพื้นที่ทำงานไม่ถูกต้อง");
  if ((await operations.access(actor, input.id)).role !== "owner")
    throw new CloudError(403, "เฉพาะเจ้าของพื้นที่เท่านั้น");
  if (input.action === "invite") {
    if (
      typeof input.email !== "string" ||
      input.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      !["editor", "viewer"].includes(String(input.role))
    )
      throw new CloudError(422, "ตรวจอีเมลและสิทธิ์ผู้รับเชิญ");
    return operations.invite(
      actor,
      input.id,
      input.email.trim().toLowerCase(),
      input.role as "editor" | "viewer",
    );
  }
  if (input.action === "role") {
    if (
      typeof input.user !== "string" ||
      !uuidPattern.test(input.user) ||
      !["editor", "viewer"].includes(String(input.role)) ||
      typeof input.active !== "boolean"
    )
      throw new CloudError(422, "ข้อมูลสิทธิ์ไม่ถูกต้อง");
    return operations.setRole(
      actor,
      input.id,
      input.user,
      input.role as "editor" | "viewer",
      input.active,
    );
  }
  throw new CloudError(400, "ไม่รองรับคำขอนี้");
}
