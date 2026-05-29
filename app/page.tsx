import React from "react";
import { CreateUserForm } from "@/components/create-user/create-user-form";
import { listVisibleFeatures } from "@/lib/supabase/features";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listEnabledTemplatesWithFeatureIds } from "@/lib/supabase/templates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const client = createServerSupabaseClient();
  const [templates, features] = await Promise.all([
    listEnabledTemplatesWithFeatureIds(client),
    listVisibleFeatures(client),
  ]);

  const defaultUsageLocation = process.env.DEFAULT_USAGE_LOCATION ?? "US";
  const captchaEnabled = process.env.CAPTCHA_ENABLED === "true";
  const captchaProvider = captchaEnabled ? process.env.CAPTCHA_PROVIDER ?? null : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: "74rem", display: "grid", gap: "1.5rem" }}>
        <header
          style={{
            alignItems: "start",
            display: "flex",
            gap: "1rem",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <section style={{ display: "grid", gap: "0.65rem", maxWidth: "48rem" }}>
            <p style={{ margin: 0, color: "#52627a", fontSize: "0.82rem", textTransform: "uppercase" }}>
              Microsoft 365 自助前台
            </p>
            <h1 style={{ margin: 0, color: "#10233f", fontSize: "2.35rem", lineHeight: 1.12 }}>
              建立 Microsoft 365 使用者
            </h1>
            <p style={{ margin: 0, color: "#52627a", lineHeight: 1.65 }}>
              依照已核准的模板與功能項送出建立請求，系統會自動預覽可用授權並保留處理記錄。
            </p>
          </section>
          <a
            href="/admin"
            style={{
              border: "1px solid #cfd8e6",
              borderRadius: "0.5rem",
              color: "#17345f",
              padding: "0.65rem 0.9rem",
              whiteSpace: "nowrap",
            }}
          >
            管理後台
          </a>
        </header>
        <CreateUserForm
          captchaEnabled={captchaEnabled}
          captchaProvider={captchaProvider}
          defaultUsageLocation={defaultUsageLocation}
          features={features}
          templates={templates}
        />
      </div>
    </main>
  );
}
