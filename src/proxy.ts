import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const nextAuth = NextAuth(authConfig);

export async function proxy(request: NextRequest, event: any) {
  const response = (await (nextAuth.auth as any)(request, event)) || NextResponse.next();

  // Inject Strict Production Security Headers
  if (response && response.headers) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth/signin|sw.js|manifest.json).*)"],
};
