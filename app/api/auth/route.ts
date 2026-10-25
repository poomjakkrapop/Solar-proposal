import { checkOrigin, readJson } from "../../../lib/cloud-contract";
import { authInput } from "../../../lib/auth-contract";
import { cloudFailure, sessionClient } from "../../../lib/supabase/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = authInput(await readJson(request, 4096));
    const session = await sessionClient();
    if (input.action === "signout") {
      const { error } = await session.client.auth.signOut({ scope: "local" });
      return session.respond(
        error ? { error: "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่" } : { ok: true },
        error ? 503 : 200,
      );
    }
    const { error } = await session.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    return session.respond(
      error
        ? { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล" }
        : { ok: true },
      error ? 401 : 200,
    );
  } catch (error) {
    return cloudFailure(error);
  }
}
