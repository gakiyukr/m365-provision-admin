import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";

export const protectedRoutePrefixes = ["/create-user", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function requireAdminSession(request: Request) {
  return readSessionFromRequest(request);
}

export function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}
