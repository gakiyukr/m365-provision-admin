import React from "react";
import { TemplateEditor } from "@/components/admin/template-editor";
import { listVisibleFeatures } from "@/lib/supabase/features";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listEnabledTemplatesWithFeatureIds } from "@/lib/supabase/templates";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  const client = createServerSupabaseClient();
  const [templates, features] = await Promise.all([
    listEnabledTemplatesWithFeatureIds(client),
    listVisibleFeatures(client),
  ]);

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>管理後台</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>模板</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          查看目前啟用的建立使用者模板，以及它們對應的功能組合。
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">建立使用者</a>
          <a href="/admin/subscriptions">訂閱</a>
          <a href="/admin/features">功能項</a>
          <a href="/admin/policies">策略</a>
          <a href="/admin/records">記錄</a>
          <a href="/admin/settings">設定</a>
        </nav>
      </section>
      <TemplateEditor features={features} templates={templates} />
    </main>
  );
}
