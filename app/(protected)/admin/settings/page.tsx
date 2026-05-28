import React from "react";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const defaultUsageLocation = process.env.DEFAULT_USAGE_LOCATION ?? "US";
  const captchaEnabled = process.env.CAPTCHA_ENABLED === "true";
  const captchaProvider = captchaEnabled ? process.env.CAPTCHA_PROVIDER ?? "已設定的服務" : "已停用";

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
      <section style={{ display: "grid", gap: "0.65rem" }}>
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>管理後台</p>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>設定</h1>
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          查看目前會影響建立使用者請求與操作體驗的執行期預設值。
        </p>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/create-user">建立使用者</a>
          <a href="/admin/subscriptions">訂閱</a>
          <a href="/admin/features">功能項</a>
          <a href="/admin/templates">模板</a>
          <a href="/admin/policies">策略</a>
          <a href="/admin/records">記錄</a>
        </nav>
      </section>
      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
        }}
      >
        <article
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
          }}
        >
          <strong>預設使用地區</strong>
          <p style={{ margin: "0.6rem 0 0", color: "#42526b", lineHeight: 1.6 }}>{defaultUsageLocation}</p>
        </article>
        <article
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
          }}
        >
          <strong>CAPTCHA 模式</strong>
          <p style={{ margin: "0.6rem 0 0", color: "#42526b", lineHeight: 1.6 }}>
            {captchaEnabled ? `已啟用（${captchaProvider}）` : "已停用"}
          </p>
        </article>
        <article
          style={{
            borderRadius: "1.25rem",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 18px 40px rgba(20, 32, 51, 0.1)",
            padding: "1.2rem",
          }}
        >
          <strong>目前用途</strong>
          <p style={{ margin: "0.6rem 0 0", color: "#42526b", lineHeight: 1.6 }}>
            受保護的建立使用者流程、Supabase 設定管理，以及 Microsoft Graph 使用者建立。
          </p>
        </article>
      </section>
    </main>
  );
}
