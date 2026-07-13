import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { sessionCookie } from "@/lib/auth/constants";

const publicPaths = ["/login", "/robots.txt", "/favicon.ico", "/api/auth/login"];
const staticPrefixes = ["/_next", "/images", "/public"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const responseHeaders = new Headers(request.headers);
  const response = NextResponse.next({ request: { headers: responseHeaders } });
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  if (publicPaths.includes(pathname) || staticPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return response;
  }

  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me"));
    return response;
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
