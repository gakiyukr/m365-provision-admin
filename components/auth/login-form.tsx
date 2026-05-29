"use client";

import type { FormEvent } from "react";
import React from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  error?: string;
};

export function LoginForm() {
  const router = useRouter();
  const networkErrorMessage = "無法登入";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const errorElement = form.querySelector<HTMLParagraphElement>("[data-login-error]");

    if (errorElement) {
      errorElement.textContent = "";
    }

    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    let response: Response;

    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      if (errorElement) {
        errorElement.textContent = networkErrorMessage;
      }

      return;
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as LoginResponse | null;

      if (errorElement) {
        errorElement.textContent = data?.error ?? networkErrorMessage;
      }

      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <section>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.85rem" }}>
        <label style={{ color: "#26364d", display: "grid", gap: "0.35rem", fontSize: "0.95rem" }}>
          管理員帳號
          <input
            autoComplete="username"
            name="username"
            style={{
              border: "1px solid #c8d4e8",
              borderRadius: "0.5rem",
              color: "#10233f",
              font: "inherit",
              padding: "0.75rem 0.8rem",
            }}
            type="text"
          />
        </label>
        <label style={{ color: "#26364d", display: "grid", gap: "0.35rem", fontSize: "0.95rem" }}>
          密碼
          <input
            autoComplete="current-password"
            name="password"
            style={{
              border: "1px solid #c8d4e8",
              borderRadius: "0.5rem",
              color: "#10233f",
              font: "inherit",
              padding: "0.75rem 0.8rem",
            }}
            type="password"
          />
        </label>
        <button
          style={{
            background: "#173563",
            border: 0,
            borderRadius: "0.5rem",
            color: "#ffffff",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 600,
            padding: "0.8rem 1rem",
          }}
          type="submit"
        >
          登入後台
        </button>
        <p aria-live="polite" data-login-error="" role="status" style={{ color: "#8a1f1f", margin: 0 }} />
      </form>
    </section>
  );
}
