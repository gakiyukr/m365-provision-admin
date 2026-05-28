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
            Protected area
          </p>
          <h2 style={{ margin: "0.5rem 0 0", fontSize: "1.6rem" }}>Provisioning</h2>
        </div>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">Create user</a>
          <a href="/admin/subscriptions">Subscriptions</a>
          <a href="/admin/features">Features</a>
          <a href="/admin/templates">Templates</a>
          <a href="/admin/policies">Policies</a>
          <a href="/admin/records">Records</a>
          <a href="/admin/settings">Settings</a>
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
