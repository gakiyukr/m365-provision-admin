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
          Subscription policies will appear here after the first sync.
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
                  Assignable: {subscription.policy?.is_assignable ? "Yes" : "No"} | Priority: {subscription.policy?.priority ?? "—"}
                </span>
              </div>
              <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>{subscription.policy?.notes || "No subscription notes recorded."}</p>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div>
                  <strong>Forced keep plans:</strong>{" "}
                  {forcedKeepPlans.length === 0
                    ? "None"
                    : forcedKeepPlans.map((policy) => policy.service_plan_name).join(", ")}
                </div>
                <div>
                  <strong>Forbidden plans:</strong>{" "}
                  {forbiddenPlans.length === 0
                    ? "None"
                    : forbiddenPlans.map((policy) => policy.service_plan_name).join(", ")}
                </div>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
