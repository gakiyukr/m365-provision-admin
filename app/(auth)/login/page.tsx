import React from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main
      style={{
        background: "#f7f9fc",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "28rem",
          border: "1px solid #dbe3ef",
          borderRadius: "0.5rem",
          padding: "2rem",
          background: "#ffffff",
          boxShadow: "0 16px 36px rgba(21, 38, 65, 0.08)",
        }}
      >
        <p style={{ margin: 0, color: "#52627a", fontSize: "0.8rem", textTransform: "uppercase" }}>
          Office 365 User Admin
        </p>
        <h1 style={{ margin: "0.75rem 0 0", color: "#10233f", fontSize: "2rem" }}>管理後台登入</h1>
        <p style={{ margin: "0.75rem 0 1.5rem", color: "#42526b", lineHeight: 1.6 }}>
          此入口僅供後台管理使用。公開建立使用者流程請回到自助前台。
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
