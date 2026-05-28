import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedPath, redirectToLogin, requireAdminSession } from "@/lib/auth/guard";

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const session = await requireAdminSession(request);

  if (!session) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create-user/:path*", "/admin/:path*"],
};
