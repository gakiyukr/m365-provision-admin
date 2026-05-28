import React from "react";
import type { TableRow } from "@/types/database";

type ProvisionRecord = TableRow<"provision_records">;

export function RecordsTable({
  records,
  templateNames,
}: {
  records: ProvisionRecord[];
  templateNames: Record<string, string>;
}) {
  return (
    <section
      style={{
        borderRadius: "1.25rem",
        background: "rgba(255, 255, 255, 0.94)",
        boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "58rem" }}>
          <thead style={{ background: "#eef4fb" }}>
            <tr>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>建立時間</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>使用者</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>模板</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>SKU</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>狀態</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>錯誤</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "1rem", color: "#42526b" }}>
                  目前還沒有建立記錄。
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} style={{ borderTop: "1px solid #e3ebf5" }}>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>{new Date(record.created_at).toLocaleString()}</td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>
                    <strong>{record.display_name}</strong>
                    <div style={{ color: "#42526b", marginTop: "0.35rem" }}>{record.user_principal_name}</div>
                  </td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>
                    {record.template_id ? templateNames[record.template_id] ?? record.template_id : "自訂"}
                  </td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>{record.selected_sku_part_number ?? "—"}</td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>{record.status}</td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>{record.error_message ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
