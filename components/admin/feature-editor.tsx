import React from "react";
import type { VisibleFeature } from "@/lib/supabase/features";

export function FeatureEditor({ features }: { features: VisibleFeature[] }) {
  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
      }}
    >
      {features.length === 0 ? (
        <div
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
            color: "#42526b",
          }}
        >
          目前沒有可見的功能項設定。
        </div>
      ) : (
        features.map((feature) => (
          <article
            key={feature.id}
            style={{
              borderRadius: "1.25rem",
              background: "rgba(255, 255, 255, 0.94)",
              boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
              padding: "1.2rem",
              display: "grid",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "baseline" }}>
              <strong>{feature.name}</strong>
              <span style={{ color: "#42526b", fontSize: "0.9rem" }}>#{feature.sort_order}</span>
            </div>
            <div style={{ color: "#173563", fontSize: "0.9rem" }}>{feature.key}</div>
            <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>{feature.description || "尚未提供說明。"}</p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <span
                style={{
                  borderRadius: "999px",
                  background: feature.is_default_selected ? "#d8ecde" : "#eef4fb",
                  color: "#173563",
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.85rem",
                }}
              >
                {feature.is_default_selected ? "預設選取" : "可選"}
              </span>
              <span
                style={{
                  borderRadius: "999px",
                  background: "#eef4fb",
                  color: "#173563",
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.85rem",
                }}
              >
                前台可見
              </span>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
