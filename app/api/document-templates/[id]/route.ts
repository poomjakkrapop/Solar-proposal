import { NextResponse } from "next/server";
import { CloudError } from "../../../../lib/cloud-contract";
import { documentTemplateRequest } from "../../../../lib/document-template-service";
import { builtinTemplateCatalog } from "../../../../lib/builtin-template-catalog";
import {
  cloudFailure,
  requireIdentity,
  sessionClient,
  writerClient,
} from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let session: Awaited<ReturnType<typeof sessionClient>> | undefined;
  const withSessionCookies = (response: Response) => {
    const result = new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
    result.headers.set("Cache-Control", "private, no-store");
    result.headers.set("Pragma", "no-cache");
    result.headers.set("Vary", "Cookie");
    result.headers.set("X-Content-Type-Options", "nosniff");
    if (session)
      for (const cookie of session.respond(null).cookies.getAll())
        result.cookies.set(cookie);
    return result;
  };
  try {
    const { id } = await context.params;
    const response = await documentTemplateRequest(request, id, {
      async identity() {
        session = await sessionClient();
        const user = await requireIdentity(session);
        return { id: user.id, confirmed: !!user.email_confirmed_at };
      },
      async membership(actor) {
        if (!session) throw new CloudError(401, "กรุณาเข้าสู่ระบบใหม่");
        const { data, error } = await session.client
          .from("sd_v2_members")
          .select("role,active")
          .eq("user_id", actor.id)
          .eq("active", true)
          .in("role", ["owner", "editor", "viewer"])
          .limit(1)
          .maybeSingle();
        if (error) throw new CloudError(503, "ตรวจสิทธิ์ต้นแบบเอกสารไม่สำเร็จ");
        return data || undefined;
      },
      async read(templateId) {
        const { data, error } = await writerClient()
          .from("sd_v2_document_templates")
          .select("id,sha256,content_base64")
          .eq("id", templateId)
          .eq(
            "sha256",
            builtinTemplateCatalog.find((entry) => entry.id === templateId)!
              .sha256,
          )
          .maybeSingle();
        if (error)
          throw new CloudError(503, "อ่านต้นแบบส่วนกลางไม่สำเร็จ กรุณาลองใหม่");
        return data;
      },
    });
    return withSessionCookies(response);
  } catch (error) {
    return withSessionCookies(cloudFailure(error));
  }
}
