import React from "react";
import { AdminNav } from "@/components/admin/admin-nav";
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
        <AdminNav />
      </section>
      <FeatureEditor features={features} />
    </main>
  );
}
