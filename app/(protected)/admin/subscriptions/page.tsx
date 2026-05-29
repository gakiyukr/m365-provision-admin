import React from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { SubscriptionTable } from "@/components/admin/subscription-table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSubscriptionCatalog } from "@/lib/supabase/subscriptions";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await listSubscriptionCatalog(createServerSupabaseClient());

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>管理後台</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>訂閱</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          查看已同步的 Microsoft 365 訂閱目錄、可用席位，以及可分配策略摘要。
        </p>
        <AdminNav />
      </section>
      <SubscriptionTable subscriptions={subscriptions} />
    </main>
  );
}
