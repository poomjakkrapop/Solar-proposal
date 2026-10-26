import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CloudError } from "../cloud-contract";
import { backendFetch } from "../backend-fetch";

export const cloudEnabled = () =>
  process.env.SOLARDESK_CLOUD_ENABLED === "true";
export function cloudConfig() {
  if (!cloudEnabled()) throw new CloudError(503, "ยังไม่ได้เปิดระบบข้อมูลกลาง");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const site = process.env.SOLARDESK_APP_URL;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!url || !key || !secret || !site || !ref)
    throw new CloudError(503, "การตั้งค่าระบบข้อมูลกลางยังไม่ครบ");
  const endpoint = new URL(url);
  const origin = new URL(site);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== `${ref}.supabase.co` ||
    (origin.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      ))
  )
    throw new CloudError(503, "การตั้งค่า URL ไม่ถูกต้อง");
  return { url, key, secret, site: origin.origin };
}
export async function sessionClient() {
  const config = cloudConfig();
  const store = await cookies();
  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const client = createServerClient(config.url, config.key, {
    global: { fetch: backendFetch },
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(changes) {
        pending.push(...changes);
      },
    },
  });
  return {
    client,
    respond(body: unknown, status = 200) {
      const response = NextResponse.json(body, {
        status,
        headers: {
          "Cache-Control": "private, no-store",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      });
      for (const cookie of pending)
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    },
    redirect(path: string) {
      const response = NextResponse.redirect(new URL(path, config.site), 303);
      response.headers.set("Cache-Control", "private, no-store");
      for (const cookie of pending)
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    },
  };
}
/** Only server mutations use this client, after verified identity and DB-side membership checks. */
export function writerClient() {
  const config = cloudConfig();
  return createClient(config.url, config.secret, {
    global: { fetch: backendFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireIdentity(
  session: Awaited<ReturnType<typeof sessionClient>>,
) {
  const { data, error } = await session.client.auth.getUser();
  if (error || !data.user) throw new CloudError(401, "กรุณาเข้าสู่ระบบใหม่");
  return data.user;
}
export function cloudFailure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof CloudError
          ? error.message
          : "ระบบข้อมูลกลางไม่พร้อม ยังยืนยันผลไม่ได้ กรุณาตรวจข้อมูลล่าสุดก่อนลองใหม่",
    },
    {
      status: error instanceof CloudError ? error.status : 503,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
