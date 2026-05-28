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
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Policies</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          Inspect subscription-level assignability rules together with forced-keep and forbidden service plan policies.
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">Create user</a>
          <a href="/admin/subscriptions">Subscriptions</a>
          <a href="/admin/features">Features</a>
          <a href="/admin/templates">Templates</a>
          <a href="/admin/records">Records</a>
          <a href="/admin/settings">Settings</a>
        </nav>
      </section>
      <PolicyEditor subscriptions={subscriptions} />
    </main>
  );
}
