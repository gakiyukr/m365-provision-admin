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
          No enabled templates are configured.
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
            <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>{template.description || "No description provided."}</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {template.featureIds.length === 0 ? (
                <span style={{ color: "#42526b" }}>No linked features</span>
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
                    {featureNameById.get(featureId) ?? featureId}
                  </span>
                ))
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
