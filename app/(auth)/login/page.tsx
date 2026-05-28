import React from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main
      style={{
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
          borderRadius: "1.5rem",
          padding: "2rem",
          background: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 24px 60px rgba(20, 32, 51, 0.12)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          管理員登入
        </p>
        <h1 style={{ margin: "0.75rem 0 0", fontSize: "2rem" }}>登入</h1>
        <p style={{ margin: "0.75rem 0 1.5rem", color: "#42526b", lineHeight: 1.6 }}>
          請使用管理員帳號與密碼登入，繼續進入建立使用者工作區。
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
