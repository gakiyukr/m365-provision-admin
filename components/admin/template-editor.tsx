import React from "react";
import type { VisibleFeature } from "@/lib/supabase/features";
import type { EnabledTemplateWithFeatureIds } from "@/lib/supabase/templates";

export function TemplateEditor({
  templates,
  features,
}: {
  templates: EnabledTemplateWithFeatureIds[];
  features: VisibleFeature[];
}) {
  const featureNameById = new Map(features.map((feature) => [feature.id, feature.name]));
  const visibleFeatureIds = new Set(features.map((feature) => feature.id));

  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
      }}
    >
      {templates.length === 0 ? (
        <div
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
            color: "#42526b",
          }}
        >
          目前沒有啟用中的模板。
        </div>
      ) : (
        templates.map((template) => (
          <article
            key={template.id}
            style={{
              borderRadius: "1.25rem",
              background: "rgba(255, 255, 255, 0.94)",
              boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
              padding: "1.2rem",
              display: "grid",
              gap: "0.7rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "baseline" }}>
              <strong>{template.name}</strong>
              <span style={{ color: "#42526b", fontSize: "0.9rem" }}>#{template.sort_order}</span>
            </div>
            <div style={{ color: "#173563", fontSize: "0.9rem" }}>{template.key}</div>
            <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>{template.description || "尚未提供說明。"}</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {template.featureIds.length === 0 ? (
                <span style={{ color: "#42526b" }}>沒有關聯功能項</span>
              ) : (
                template.featureIds.map((featureId) => (
                  <span
                    key={featureId}
                    style={{
                      borderRadius: "999px",
                      background: "#eef4fb",
                      color: "#173563",
                      padding: "0.35rem 0.7rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {featureNameById.get(featureId) ?? `${featureId}（未在前台顯示）`}
                  </span>
                ))
              )}
            </div>
            {template.featureIds.some((featureId) => !visibleFeatureIds.has(featureId)) ? (
              <p style={{ margin: 0, color: "#8a5a12", lineHeight: 1.6 }}>
                此模板包含部分未在前台顯示的功能項；系統在套用模板時仍會一併帶入。
              </p>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
