import { jwtVerify, SignJWT } from "jose";
import { findAdminByUsername } from "@/lib/supabase/admins";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const SESSION_COOKIE_NAME = "office_admin_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  adminId: string;
  username: string;
};

type CookieGetter = {
  get(name: string): { value: string } | undefined;
};

type RequestWithOptionalCookies = Request & {
  cookies?: CookieGetter;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
  };
}

function parseCookieHeader(header: string | null, name: string) {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName === name) {
      return rawValueParts.join("=") || null;
    }
  }

  return null;
}

function getSessionTokenFromRequest(request: RequestWithOptionalCookies) {
  const cookieStore = request.cookies;
  if (cookieStore) {
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  }

  return parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE_NAME);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const result = await jwtVerify(token, getSessionSecret());
  const { adminId, username } = result.payload;

  if (typeof adminId !== "string" || typeof username !== "string") {
    throw new Error("Invalid session payload");
  }

  return { adminId, username };
}

export async function setSessionCookie(token: string): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...getSessionCookieOptions(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function readSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const token = getSessionTokenFromRequest(request as RequestWithOptionalCookies);

  if (!token) {
    return null;
  }

  let payload: SessionPayload;

  try {
    payload = await verifySessionToken(token);
  } catch {
    return null;
  }

  const client = createServerSupabaseClient();
  const admin = await findAdminByUsername(client, payload.username);

  if (!admin || admin.id !== payload.adminId) {
    return null;
  }

  return payload;
}
