"use client";

import React from "react";
import type { FormEvent } from "react";
import type { VisibleFeature } from "@/lib/supabase/features";
import type { EnabledTemplateWithFeatureIds } from "@/lib/supabase/templates";

type CreateUserFormProps = {
  defaultUsageLocation: string;
  captchaEnabled: boolean;
  captchaProvider?: string | null;
  templates: EnabledTemplateWithFeatureIds[];
  features: VisibleFeature[];
};

type PreviewResponse = {
  ok?: boolean;
  error?: string;
  selectedSku?: {
    skuId: string;
    skuPartNumber: string;
  } | null;
  enabledApplications?: string[];
  disabledServicePlanIds?: string[];
  unavailableFeatures?: Array<{
    featureId: string;
    featureKey: string;
    featureName: string;
  }>;
  failureReason?: string | null;
};

type SubmitResponse = {
  ok?: boolean;
  error?: string;
  graphUserId?: string;
  warnings?: string[];
  details?: Record<string, string>;
};

function readTemplateFeatureIds(form: HTMLFormElement) {
  const input = form.querySelector<HTMLInputElement>('input[name="selectedTemplateFeatureIds"]');

  if (!input || !input.value) {
    return [];
  }

  try {
    const parsed = JSON.parse(input.value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((featureId): featureId is string => typeof featureId === "string" && featureId.length > 0)
      : [];
  } catch {
    return [];
  }
}

function readSelectedFeatureIds(form: HTMLFormElement) {
  const selectedFeatureIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="selectedFeatureIds"]:checked')).map(
    (input) => input.value,
  );
  const combined = new Set([...selectedFeatureIds, ...readTemplateFeatureIds(form)]);
  return [...combined];
}

function setMessage(form: HTMLFormElement, selector: string, message: string) {
  const element = form.querySelector<HTMLElement>(selector);

  if (element) {
    element.textContent = message;
  }
}

function describePreview(data: PreviewResponse) {
  if (data.error) {
    return data.error;
  }

  if (!data.ok || !data.selectedSku) {
    const unavailable = (data.unavailableFeatures ?? []).map((feature) => feature.featureName).join("、");

    if (unavailable) {
      return `目前沒有單一 SKU 能同時滿足：${unavailable}。`;
    }

    if (data.failureReason === "no_single_sku_covers_selection") {
      return "目前沒有任何單一 SKU 能同時涵蓋這組功能項，請調整模板或功能選擇。";
    }

    return "目前沒有可分配的 SKU 能滿足這組選擇。";
  }

  const enabledApplications = (data.enabledApplications ?? []).join("、") || "沒有解析出任何應用";
  const disabledCount = data.disabledServicePlanIds?.length ?? 0;

  return `已選中 SKU：${data.selectedSku.skuPartNumber}。啟用應用：${enabledApplications}。停用服務方案數：${disabledCount}。`;
}

function buildSubmitPayload(
  formData: FormData,
  selectedFeatureIds: string[],
  captchaEnabled: boolean,
  defaultUsageLocation: string,
) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const userName = String(formData.get("userName") ?? "").trim();
  const userPrincipalName = String(formData.get("userPrincipalName") ?? "").trim();
  const mailNickname = String(formData.get("mailNickname") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const usageLocation = String(formData.get("usageLocation") ?? defaultUsageLocation).trim().toUpperCase();
  const selectedTemplateId = String(formData.get("selectedTemplateId") ?? "").trim();
  const captchaToken = captchaEnabled ? String(formData.get("captchaToken") ?? "").trim() : "";

  return {
    displayName,
    userName,
    userPrincipalName,
    mailNickname,
    password,
    usageLocation,
    forceChangePasswordNextSignIn: formData.get("forceChangePasswordNextSignIn") === "on",
    selectedTemplateId: selectedTemplateId || null,
    selectedFeatureIds,
    captchaToken,
  };
}

function syncTemplateFeatures(
  form: HTMLFormElement,
  templates: EnabledTemplateWithFeatureIds[],
  features: VisibleFeature[],
  templateId: string,
) {
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;
  const hiddenInput = form.querySelector<HTMLInputElement>('input[name="selectedTemplateFeatureIds"]');
  const selectedFeatureIds = new Set(
    selectedTemplate
      ? selectedTemplate.featureIds
      : features.filter((feature) => feature.is_default_selected).map((feature) => feature.id),
  );

  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(selectedTemplate?.featureIds ?? []);
  }

  for (const checkbox of form.querySelectorAll<HTMLInputElement>('input[name="selectedFeatureIds"]')) {
    checkbox.checked = selectedFeatureIds.has(checkbox.value);
  }
}

function createPreviewController() {
  let latestRequestId = 0;
  let currentAbortController: AbortController | null = null;

  return async function requestPreview(form: HTMLFormElement) {
    latestRequestId += 1;
    const requestId = latestRequestId;
    currentAbortController?.abort();
    currentAbortController = typeof AbortController === "function" ? new AbortController() : null;
    const selectedFeatureIds = readSelectedFeatureIds(form);

    try {
      const response = await fetch("/api/license-preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ featureIds: selectedFeatureIds }),
        signal: currentAbortController?.signal,
      });

      const data = (await response.json().catch(() => null)) as PreviewResponse | null;
      if (requestId !== latestRequestId) {
        return;
      }

      setMessage(form, "[data-create-user-preview]", describePreview(data ?? { error: "無法載入授權預覽" }));
    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setMessage(form, "[data-create-user-preview]", "無法載入授權預覽");
    }
  };
}

export function CreateUserForm({
  defaultUsageLocation,
  captchaEnabled,
  captchaProvider,
  templates,
  features,
}: CreateUserFormProps) {
  const requestPreview = createPreviewController();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedFeatureIds = readSelectedFeatureIds(form);
    const payload = buildSubmitPayload(formData, selectedFeatureIds, captchaEnabled, defaultUsageLocation);

    setMessage(form, "[data-create-user-status]", "正在送出建立使用者請求...");

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as SubmitResponse | null;

      if (!response.ok) {
        const detailText = data?.details
          ? ` ${Object.entries(data.details)
              .map(([field, message]) => `${field}：${message}`)
              .join("；")}`
          : "";
        setMessage(form, "[data-create-user-status]", `${data?.error ?? "建立使用者失敗"}${detailText}`);
        return;
      }

      const warnings = data?.warnings?.length ? ` 警告：${data.warnings.join("；")}` : "";
      setMessage(
        form,
        "[data-create-user-status]",
        `建立使用者請求已完成${data?.graphUserId ? `（${data.graphUserId}）` : ""}。${warnings}`.trim(),
      );
    } catch {
      setMessage(form, "[data-create-user-status]", "無法送出建立使用者請求");
    }
  }

  function handleTemplateChange(event: FormEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    syncTemplateFeatures(form, templates, features, event.currentTarget.value);
    void requestPreview(form);
  }

  function handleFeatureToggle(event: FormEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    const templateSelect = form.querySelector<HTMLSelectElement>('select[name="selectedTemplateId"]');
    const hiddenTemplateFeaturesInput = form.querySelector<HTMLInputElement>('input[name="selectedTemplateFeatureIds"]');
    if (templateSelect && templateSelect.value) {
      templateSelect.value = "";
    }

    if (hiddenTemplateFeaturesInput) {
      hiddenTemplateFeaturesInput.value = JSON.stringify([]);
    }

    void requestPreview(form);
  }

  function handlePreviewClick(event: FormEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    setMessage(form, "[data-create-user-preview]", "正在載入授權預覽...");
    void requestPreview(form);
  }

  return (
    <section
      style={{
        borderRadius: "1.5rem",
        padding: "1.5rem",
        background: "rgba(255, 255, 255, 0.94)",
        boxShadow: "0 24px 60px rgba(20, 32, 51, 0.12)",
      }}
    >
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        建立使用者工作區
      </p>
      <h1 style={{ margin: 0, fontSize: "2rem" }}>建立使用者</h1>
      <p style={{ margin: "0.75rem 0 0", color: "#42526b", lineHeight: 1.6 }}>
        建立 Microsoft 365 帳號，並記錄最終授權分配結果。
      </p>
      <p style={{ margin: "0.75rem 0 1.5rem", color: "#42526b", lineHeight: 1.6 }}>
        先選擇模板、確認功能項、預覽匹配到的 SKU，最後再送出建立請求。
      </p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          顯示名稱
          <input
            defaultValue=""
            name="displayName"
            placeholder="例如：陳冠宇"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          使用者名稱
          <input
            defaultValue=""
            name="userName"
            placeholder="例如：chen.guanyu"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          使用者主體名稱
          <input
            defaultValue=""
            name="userPrincipalName"
            placeholder="例如：chen.guanyu@contoso.com"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="email"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          郵件別名
          <input
            defaultValue=""
            name="mailNickname"
            placeholder="例如：chen.guanyu"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          暫時密碼
          <input
            defaultValue=""
            name="password"
            placeholder="例如：Password123!"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="password"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          使用地區
          <input
            defaultValue={defaultUsageLocation}
            maxLength={2}
            name="usageLocation"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem", textTransform: "uppercase" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          模板預設
          <input defaultValue={JSON.stringify([])} name="selectedTemplateFeatureIds" type="hidden" />
          <select
            defaultValue=""
            name="selectedTemplateId"
            onChange={handleTemplateChange}
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
          >
            <option value="">自訂選擇</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset
          style={{
            margin: 0,
            borderRadius: "1rem",
            border: "1px solid #d7e2f0",
            padding: "1rem",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <legend style={{ padding: "0 0.4rem", fontWeight: 600 }}>模板說明</legend>
          {templates.length === 0 ? (
            <p style={{ margin: 0, color: "#42526b" }}>目前沒有可用的模板。</p>
          ) : (
            templates.map((template) => (
              <div key={template.id} style={{ borderRadius: "0.9rem", background: "#f6f9fd", padding: "0.85rem 0.95rem" }}>
                <strong>{template.name}</strong>
                <p style={{ margin: "0.35rem 0 0", color: "#42526b" }}>{template.description || "尚未提供說明。"}</p>
                {template.featureIds.some((featureId) => !features.some((feature) => feature.id === featureId)) ? (
                  <p style={{ margin: "0.35rem 0 0", color: "#8a5a12" }}>
                    此模板包含部分未在前台顯示的功能項；套用模板時仍會一併帶入。
                  </p>
                ) : null}
              </div>
            ))
          )}
        </fieldset>
        <fieldset
          style={{
            margin: 0,
            borderRadius: "1rem",
            border: "1px solid #d7e2f0",
            padding: "1rem",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <legend style={{ padding: "0 0.4rem", fontWeight: 600 }}>功能項選擇</legend>
          {features.length === 0 ? (
            <p style={{ margin: 0, color: "#42526b" }}>目前沒有可用的功能項。</p>
          ) : (
            features.map((feature) => (
              <label
                key={feature.id}
                style={{
                  display: "grid",
                  gap: "0.25rem",
                  borderRadius: "0.9rem",
                  background: "#f6f9fd",
                  padding: "0.85rem 0.95rem",
                }}
              >
                <span style={{ display: "flex", gap: "0.6rem", alignItems: "center", fontWeight: 600 }}>
                  <input
                    defaultChecked={feature.is_default_selected}
                    name="selectedFeatureIds"
                    onChange={handleFeatureToggle}
                    type="checkbox"
                    value={feature.id}
                  />
                  {feature.name}
                </span>
                <span style={{ color: "#42526b" }}>{feature.description || "尚未提供說明。"}</span>
              </label>
            ))
          )}
        </fieldset>
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input defaultChecked={false} name="forceChangePasswordNextSignIn" type="checkbox" />
          下次登入時強制修改密碼
        </label>
        {captchaEnabled ? (
          <label style={{ display: "grid", gap: "0.35rem" }}>
            CAPTCHA 驗證碼 Token
            <input
              defaultValue=""
              name="captchaToken"
              placeholder="請貼上驗證挑戰 Token"
              style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
              type="text"
            />
          </label>
        ) : null}
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          {captchaEnabled
            ? `目前已啟用 CAPTCHA，提供者為 ${captchaProvider ?? "已設定的服務"}。`
            : "目前建立使用者請求未啟用 CAPTCHA。"}
        </p>
        <button
          onClick={handlePreviewClick}
          style={{
            justifySelf: "start",
            borderRadius: "999px",
            border: "1px solid #9ab0d0",
            background: "#ffffff",
            color: "#173563",
            cursor: "pointer",
            padding: "0.85rem 1.2rem",
          }}
          type="button"
        >
          預覽授權
        </button>
        <button
          style={{
            justifySelf: "start",
            borderRadius: "999px",
            border: 0,
            background: "#173563",
            color: "#ffffff",
            cursor: "pointer",
            padding: "0.85rem 1.2rem",
          }}
          type="submit"
        >
          建立使用者
        </button>
        <p aria-live="polite" data-create-user-preview="" role="status" style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          送出前可先預覽授權結果。
        </p>
        <p aria-live="polite" data-create-user-status="" role="status" style={{ margin: 0, color: "#173563", lineHeight: 1.6 }}>
          已準備好送出建立使用者請求。
        </p>
      </form>
    </section>
  );
}
