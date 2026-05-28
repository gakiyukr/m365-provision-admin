import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { listVisibleFeatures } from "@/lib/supabase/features";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listEnabledTemplatesWithFeatureIds } from "@/lib/supabase/templates";

export async function GET(request: Request) {
  const admin = await readSessionFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const client = createServerSupabaseClient();
    const [templates, features] = await Promise.all([
      listEnabledTemplatesWithFeatureIds(client),
      listVisibleFeatures(client),
    ]);

    const captchaEnabled = env.CAPTCHA_ENABLED === "true";

    return NextResponse.json({
      templates,
      features,
      captchaEnabled,
      captchaProvider: captchaEnabled ? env.CAPTCHA_PROVIDER ?? null : null,
      defaultUsageLocation: env.DEFAULT_USAGE_LOCATION,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "無法載入建立使用者選項" },
      { status: 500 },
    );
  }
}
