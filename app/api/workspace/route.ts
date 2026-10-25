import { createHash, randomBytes } from "node:crypto";
import {
  CloudError,
  parseCloudWorkspace,
  type CloudRole,
} from "../../../lib/cloud-contract";
import { workspaceRequest } from "../../../lib/cloud-service";
import {
  cloudFailure,
  requireIdentity,
  sessionClient,
  writerClient,
} from "../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function rpcError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "40001")
    throw new CloudError(
      409,
      "ข้อมูลเปลี่ยนจากอีกเครื่อง กรุณาเก็บร่างและเปิดฟอร์มใหม่",
    );
  if (error.code === "42501")
    throw new CloudError(403, "ไม่มีสิทธิ์ หรือรหัสเชิญไม่ถูกต้อง/หมดอายุ");
  if (error.code === "22023" || error.code === "23514")
    throw new CloudError(422, "ข้อมูลหรือเงื่อนไขไม่ถูกต้อง");
  throw new CloudError(
    503,
    "ยังยืนยันผลบันทึกไม่ได้ กรุณาตรวจข้อมูลล่าสุดก่อนลองใหม่",
  );
}
async function handle(request: Request) {
  try {
    const session = await sessionClient();
    const result = await workspaceRequest(request, {
      async identity() {
        const user = await requireIdentity(session);
        return {
          id: user.id,
          email: user.email,
          confirmed: !!user.email_confirmed_at,
        };
      },
      async access(actor, id) {
        const { data, error } = await session.client
          .from("sd_v2_members")
          .select("role")
          .eq("workspace_id", id)
          .eq("user_id", actor.id)
          .eq("active", true)
          .maybeSingle();
        if (error) throw new CloudError(503, "ตรวจสิทธิ์ไม่สำเร็จ");
        if (!data || !["owner", "editor", "viewer"].includes(data.role))
          throw new CloudError(404, "ไม่พบพื้นที่ทำงานที่เข้าถึงได้");
        return { id, role: data.role as CloudRole };
      },
      async read(actor, id) {
        const [
          { data: memberships, error: memberError },
          { data: available, error: listError },
        ] = await Promise.all([
          session.client
            .from("sd_v2_members")
            .select("workspace_id,role")
            .eq("user_id", actor.id)
            .eq("active", true),
          session.client
            .from("sd_v2_workspaces")
            .select("id,name,created_at")
            .order("created_at")
            .limit(100),
        ]);
        if (memberError || listError)
          throw new CloudError(503, "อ่านพื้นที่ทำงานไม่สำเร็จ");
        const selected = id || available?.[0]?.id;
        if (!selected) return { workspaces: [], current: null };
        const membership = memberships?.find(
          (entry) => entry.workspace_id === selected,
        );
        if (!membership)
          throw new CloudError(404, "ไม่พบพื้นที่ทำงานที่เข้าถึงได้");
        const [
          { data, error },
          { data: audit, error: auditError },
        ] = await Promise.all([
          session.client
            .from("sd_v2_workspaces")
            .select("id,revision,document")
            .eq("id", selected)
            .single(),
          session.client
            .from("sd_v2_audit")
            .select("id,event,actor_id,revision,created_at")
            .eq("workspace_id", selected)
            .order("id", { ascending: false })
            .limit(30),
        ]);
        if (error || auditError || !data)
          throw new CloudError(503, "อ่านข้อมูลไม่สำเร็จ");
        return {
          workspaces: available,
          current: parseCloudWorkspace({ ...data, role: membership.role }),
          audit,
        };
      },
      async create(actor, name, document) {
        const { data, error } = await writerClient().rpc(
          "sd_v2_create_workspace",
          { p_actor: actor.id, p_name: name, p_document: document },
        );
        rpcError(error);
        return { id: data };
      },
      async save(actor, input) {
        const { data, error } = await writerClient().rpc(
          "sd_v2_save_workspace",
          {
            p_actor: actor.id,
            p_id: input.id,
            p_revision: input.revision,
            p_document: input.document,
          },
        );
        rpcError(error);
        return { revision: data };
      },
      async team(_actor, id) {
        const { data, error } = await writerClient()
          .from("sd_v2_members")
          .select("user_id,role,active")
          .eq("workspace_id", id)
          .order("created_at");
        rpcError(error);
        return { members: data };
      },
      async invite(actor, id, email, role) {
        const token = randomBytes(32).toString("base64url");
        const { error } = await writerClient().rpc("sd_v2_invite", {
          p_actor: actor.id,
          p_id: id,
          p_email: email,
          p_role: role,
          p_token_hash: hash(token),
        });
        rpcError(error);
        return { token, expiresInDays: 7 };
      },
      async accept(actor, token) {
        const { data, error } = await writerClient().rpc(
          "sd_v2_accept_invite",
          {
            p_actor: actor.id,
            p_email: actor.email,
            p_token_hash: hash(token),
          },
        );
        rpcError(error);
        return { id: data };
      },
      async setRole(actor, id, user, role, active) {
        const { error } = await writerClient().rpc("sd_v2_set_role", {
          p_actor: actor.id,
          p_id: id,
          p_user: user,
          p_role: role,
          p_active: active,
        });
        rpcError(error);
        return { ok: true };
      },
    });
    return session.respond(result);
  } catch (error) {
    return cloudFailure(error);
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
