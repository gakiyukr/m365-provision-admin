import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const admin = await readSessionFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const captchaEnabled = env.CAPTCHA_ENABLED === "true";

  return NextResponse.json({
    captchaEnabled,
    captchaProvider: captchaEnabled ? env.CAPTCHA_PROVIDER ?? null : null,
    defaultUsageLocation: env.DEFAULT_USAGE_LOCATION,
  });
}
