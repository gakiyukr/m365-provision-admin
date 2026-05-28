import React from "react";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const defaultUsageLocation = process.env.DEFAULT_USAGE_LOCATION ?? "US";
  const captchaEnabled = process.env.CAPTCHA_ENABLED === "true";
  const captchaProvider = captchaEnabled ? process.env.CAPTCHA_PROVIDER ?? "configured provider" : "disabled";

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Settings</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          Confirm the runtime defaults that shape provisioning requests and the operator experience in this Next.js admin app.
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">Create user</a>
          <a href="/admin/subscriptions">Subscriptions</a>
          <a href="/admin/features">Features</a>
          <a href="/admin/templates">Templates</a>
          <a href="/admin/policies">Policies</a>
          <a href="/admin/records">Records</a>
        </nav>
      </section>
      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
        }}
      >
        <article
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
          }}
        >
          <strong>Default usage location</strong>
          <p style={{ margin: "0.6rem 0 0", color: "#42526b", lineHeight: 1.6 }}>{defaultUsageLocation}</p>
        </article>
        <article
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
          }}
        >
          <strong>CAPTCHA mode</strong>
          <p style={{ margin: "0.6rem 0 0", color: "#42526b", lineHeight: 1.6 }}>
            {captchaEnabled ? `Enabled (${captchaProvider})` : "Disabled"}
          </p>
        </article>
        <article
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
          }}
        >
          <strong>Operational focus</strong>
          <p style={{ margin: "0.6rem 0 0", color: "#42526b", lineHeight: 1.6 }}>
            Protected provisioning, Supabase-backed configuration, and Microsoft Graph user creation.
          </p>
        </article>
      </section>
    </main>
  );
}
