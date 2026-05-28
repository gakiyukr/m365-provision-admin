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
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Features</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          Inspect the currently enabled, frontend-visible feature catalog used by provisioning templates and previews.
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">Create user</a>
          <a href="/admin/subscriptions">Subscriptions</a>
          <a href="/admin/templates">Templates</a>
          <a href="/admin/policies">Policies</a>
          <a href="/admin/records">Records</a>
          <a href="/admin/settings">Settings</a>
        </nav>
      </section>
      <FeatureEditor features={features} />
    </main>
  );
}
