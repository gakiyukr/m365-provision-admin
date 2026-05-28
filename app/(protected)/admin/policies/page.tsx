import React from "react";
import { PolicyEditor } from "@/components/admin/policy-editor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSubscriptionCatalog } from "@/lib/supabase/subscriptions";

export const dynamic = "force-dynamic";

export default async function AdminPoliciesPage() {
  const subscriptions = await listSubscriptionCatalog(createServerSupabaseClient());

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>管理後台</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>策略</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          查看訂閱層級的可分配規則，以及必須保留與禁止使用的服務方案策略。
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">建立使用者</a>
          <a href="/admin/subscriptions">訂閱</a>
          <a href="/admin/features">功能項</a>
          <a href="/admin/templates">模板</a>
          <a href="/admin/records">記錄</a>
          <a href="/admin/settings">設定</a>
        </nav>
      </section>
      <PolicyEditor subscriptions={subscriptions} />
    </main>
  );
}
