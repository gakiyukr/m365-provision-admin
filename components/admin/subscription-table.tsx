import React from "react";
import type { listSubscriptionCatalog } from "@/lib/supabase/subscriptions";

type SubscriptionCatalog = Awaited<ReturnType<typeof listSubscriptionCatalog>>;

export function SubscriptionTable({ subscriptions }: { subscriptions: SubscriptionCatalog }) {
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "56rem" }}>
          <thead style={{ background: "#eef4fb" }}>
            <tr>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>SKU</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>可用數</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>可分配</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>優先級</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>服務方案</th>
              <th style={{ padding: "0.9rem", textAlign: "left" }}>策略備註</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "1rem", color: "#42526b" }}>
                  目前還沒有已同步的訂閱資料。
                </td>
              </tr>
            ) : (
              subscriptions.map((subscription) => (
                <tr key={subscription.sku_id} style={{ borderTop: "1px solid #e3ebf5" }}>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>
                    <strong>{subscription.sku_part_number}</strong>
                    <div style={{ color: "#42526b", marginTop: "0.35rem" }}>{subscription.sku_id}</div>
                  </td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>
                    {subscription.available_units} / {subscription.enabled_units}
                  </td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>
                    {subscription.policy?.is_assignable ? "是" : "否"}
                  </td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>{subscription.policy?.priority ?? "—"}</td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>
                    {(subscription.service_plans ?? []).length === 0
                      ? "沒有服務方案"
                      : subscription.service_plans.map((plan) => plan.service_plan_name).join("、")}
                  </td>
                  <td style={{ padding: "1rem", verticalAlign: "top" }}>{subscription.policy?.notes || "無備註"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
