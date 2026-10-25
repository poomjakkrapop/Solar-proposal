import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { backendFetch } from "./lib/backend-fetch";

export async function middleware(request: NextRequest) {
  if (process.env.SOLARDESK_CLOUD_ENABLED !== "true")
    return NextResponse.next();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const supabase = createServerClient(url, key, {
    global: { fetch: backendFetch },
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(changes, headers) {
        changes.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        changes.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  try {
    await supabase.auth.getClaims();
  } catch {
    /* Routes independently verify identity and fail closed. */
  }
  return response;
}
export const config = {
  matcher: [
    "/",
    "/login",
    "/account/:path*",
    "/auth/:path*",
    "/api/:path*",
    "/templates/:path*",
  ],
};
