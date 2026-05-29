import React from "react";
import { AdminNav } from "@/components/admin/admin-nav";

const sections = [
  {
    href: "/admin/subscriptions",
    title: "訂閱",
    description: "查看 Microsoft 365 SKU、可用席位與同步狀態。",
  },
  {
    href: "/admin/features",
    title: "功能項",
    description: "檢查前台可選功能，以及功能對應的服務方案規則。",
  },
  {
    href: "/admin/templates",
    title: "模板",
    description: "管理常用建立組合，讓前台使用者用較少步驟完成選擇。",
  },
  {
    href: "/admin/policies",
    title: "策略",
    description: "確認哪些 SKU 可被分配，以及必須保留或禁止的服務方案。",
  },
  {
    href: "/admin/records",
    title: "記錄",
    description: "追蹤建立結果、部分成功狀態與錯誤訊息。",
  },
  {
    href: "/admin/settings",
    title: "設定",
    description: "查看使用地區、CAPTCHA 與其他執行期預設值。",
  },
];

export default function AdminHomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ margin: "0 auto", maxWidth: "74rem", display: "grid", gap: "1.5rem" }}>
        <section style={{ display: "grid", gap: "0.65rem" }}>
          <p style={{ margin: 0, color: "#52627a", fontSize: "0.82rem", textTransform: "uppercase" }}>管理後台</p>
          <h1 style={{ margin: 0, color: "#10233f", fontSize: "2.2rem", lineHeight: 1.15 }}>後台入口</h1>
          <p style={{ margin: 0, color: "#52627a", lineHeight: 1.65 }}>
            從這裡檢查授權目錄、模板策略與建立記錄。公開建立流程已移到自助前台。
          </p>
          <AdminNav />
        </section>
        <section
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
          }}
        >
          {sections.map((section) => (
            <a
              href={section.href}
              key={section.href}
              style={{
                background: "#ffffff",
                border: "1px solid #dbe3ef",
                borderRadius: "0.5rem",
                boxShadow: "0 10px 28px rgba(21, 38, 65, 0.07)",
                display: "grid",
                gap: "0.45rem",
                padding: "1rem",
              }}
            >
              <strong style={{ color: "#10233f", fontSize: "1.05rem" }}>{section.title}</strong>
              <span style={{ color: "#52627a", lineHeight: 1.55 }}>{section.description}</span>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
