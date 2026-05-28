import React from "react";
import { CreateUserForm } from "@/components/create-user/create-user-form";
import { listVisibleFeatures } from "@/lib/supabase/features";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listEnabledTemplatesWithFeatureIds } from "@/lib/supabase/templates";

export const dynamic = "force-dynamic";

export default async function CreateUserPage() {
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
        display: "grid",
        gap: "1.5rem",
        alignContent: "start",
      }}
    >
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            受保護區域
          </p>
          <h2 style={{ margin: "0.5rem 0 0", fontSize: "1.6rem" }}>建立使用者</h2>
        </div>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">建立使用者</a>
          <a href="/admin/subscriptions">訂閱</a>
          <a href="/admin/features">功能項</a>
          <a href="/admin/templates">模板</a>
          <a href="/admin/policies">策略</a>
          <a href="/admin/records">記錄</a>
          <a href="/admin/settings">設定</a>
        </nav>
      </section>
      <CreateUserForm
        captchaEnabled={captchaEnabled}
        captchaProvider={captchaProvider}
        defaultUsageLocation={defaultUsageLocation}
        features={features}
        templates={templates}
      />
    </main>
  );
}
