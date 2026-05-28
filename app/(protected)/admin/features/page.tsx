import React from "react";
import { FeatureEditor } from "@/components/admin/feature-editor";
import { listVisibleFeatures } from "@/lib/supabase/features";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminFeaturesPage() {
  const features = await listVisibleFeatures(createServerSupabaseClient());

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>管理後台</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>功能項</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          查看目前已啟用且會顯示在前台的功能項目錄，供模板與授權預覽使用。
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">建立使用者</a>
          <a href="/admin/subscriptions">訂閱</a>
          <a href="/admin/templates">模板</a>
          <a href="/admin/policies">策略</a>
          <a href="/admin/records">記錄</a>
          <a href="/admin/settings">設定</a>
        </nav>
      </section>
      <FeatureEditor features={features} />
    </main>
  );
}
