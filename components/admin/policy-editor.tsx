import React from "react";
import type { listSubscriptionCatalog } from "@/lib/supabase/subscriptions";

type SubscriptionCatalog = Awaited<ReturnType<typeof listSubscriptionCatalog>>;

export function PolicyEditor({ subscriptions }: { subscriptions: SubscriptionCatalog }) {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      {subscriptions.length === 0 ? (
        <div
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
            color: "#42526b",
          }}
        >
          第一次同步完成後，訂閱策略會顯示在這裡。
        </div>
      ) : (
        subscriptions.map((subscription) => {
          const forcedKeepPlans = subscription.service_plan_policies.filter((policy) => policy.is_forced_keep);
          const forbiddenPlans = subscription.service_plan_policies.filter((policy) => policy.is_forbidden);

          return (
            <article
              key={subscription.sku_id}
              style={{
                borderRadius: "1.25rem",
                background: "rgba(255, 255, 255, 0.94)",
                boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
                padding: "1.2rem",
                display: "grid",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <strong>{subscription.sku_part_number}</strong>
                <span style={{ color: "#42526b" }}>
                  可分配：{subscription.policy?.is_assignable ? "是" : "否"} | 優先級：{subscription.policy?.priority ?? "—"}
                </span>
              </div>
              <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>{subscription.policy?.notes || "尚未記錄訂閱備註。"}</p>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div>
                  <strong>必須保留的服務方案：</strong>{" "}
                  {forcedKeepPlans.length === 0
                    ? "無"
                    : forcedKeepPlans.map((policy) => policy.service_plan_name).join("、")}
                </div>
                <div>
                  <strong>禁止使用的服務方案：</strong>{" "}
                  {forbiddenPlans.length === 0
                    ? "無"
                    : forbiddenPlans.map((policy) => policy.service_plan_name).join("、")}
                </div>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
