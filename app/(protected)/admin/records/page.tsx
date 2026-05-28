import React from "react";
import { RecordsTable } from "@/components/admin/records-table";
import { listProvisionRecords } from "@/lib/supabase/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listEnabledTemplatesWithFeatureIds } from "@/lib/supabase/templates";

export const dynamic = "force-dynamic";

export default async function AdminRecordsPage() {
  const client = createServerSupabaseClient();
  const [records, templates] = await Promise.all([
    listProvisionRecords(client),
    listEnabledTemplatesWithFeatureIds(client),
  ]);

  const templateNames = Object.fromEntries(templates.map((template) => [template.id, template.name]));

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Provision records</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          Follow provisioning outcomes, the selected SKU, and any partial-success or failure messages recorded for each request.
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">Create user</a>
          <a href="/admin/subscriptions">Subscriptions</a>
          <a href="/admin/features">Features</a>
          <a href="/admin/templates">Templates</a>
          <a href="/admin/policies">Policies</a>
          <a href="/admin/settings">Settings</a>
        </nav>
      </section>
      <RecordsTable records={records} templateNames={templateNames} />
    </main>
  );
}
