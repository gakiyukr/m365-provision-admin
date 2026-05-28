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

    router.replace("/create-user");
    router.refresh();
  }

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <label>
          使用者名稱
          <input autoComplete="username" name="username" type="text" />
        </label>
        <label>
          密碼
          <input autoComplete="current-password" name="password" type="password" />
        </label>
        <button type="submit">登入</button>
        <p aria-live="polite" data-login-error="" role="status" />
      </form>
    </section>
  );
}
