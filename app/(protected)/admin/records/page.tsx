import React from "react";
import { AdminNav } from "@/components/admin/admin-nav";
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
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>管理後台</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>建立記錄</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          查看每次建立使用者的結果、選到的 SKU，以及部分成功或失敗訊息。
        </p>
        <AdminNav />
      </section>
      <RecordsTable records={records} templateNames={templateNames} />
    </main>
  );
}
