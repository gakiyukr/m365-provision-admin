import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findAdminByUsername, touchAdminLastLogin } from "@/lib/supabase/admins";

type LoginBody = {
  username?: string;
  password?: string;
};

const FALLBACK_PASSWORD_HASH = "$2a$12$yZL9aDgQXv8V0F8aV4Vv7e4j0U6n7zYjM8gAx9qVdV8T8oB2mL1a2";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const username = body?.username?.trim();
  const password = body?.password;

  if (!username || !password) {
    return NextResponse.json({ error: "必須提供使用者名稱與密碼" }, { status: 400 });
  }

  const client = createServerSupabaseClient();
  const admin = await findAdminByUsername(client, username);

  if (!admin) {
    await verifyPassword(password, FALLBACK_PASSWORD_HASH);
    return NextResponse.json({ error: "使用者名稱或密碼錯誤" }, { status: 401 });
  }

  const passwordMatches = await verifyPassword(password, admin.password_hash);

  if (!passwordMatches) {
    return NextResponse.json({ error: "使用者名稱或密碼錯誤" }, { status: 401 });
  }

  const token = await createSessionToken({
    adminId: admin.id,
    username: admin.username,
  });

  await setSessionCookie(token);
  const touchLastLoginResult = touchAdminLastLogin(client, admin.id);
  if (touchLastLoginResult && typeof touchLastLoginResult.catch === "function") {
    void touchLastLoginResult.catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
