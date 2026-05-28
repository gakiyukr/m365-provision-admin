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
    const unavailable = (data.unavailableFeatures ?? []).map((feature) => feature.featureName).join(", ");
    return unavailable
      ? `No single SKU can satisfy: ${unavailable}.`
      : `No assignable SKU currently satisfies this selection${data.failureReason ? ` (${data.failureReason})` : ""}.`;
  }

  const enabledApplications = (data.enabledApplications ?? []).join(", ") || "No applications resolved";
  const disabledCount = data.disabledServicePlanIds?.length ?? 0;

  return `Selected SKU ${data.selectedSku.skuPartNumber}. Enabled applications: ${enabledApplications}. Disabled service plans: ${disabledCount}.`;
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
    selectedTemplate ? selectedTemplate.featureIds : features.filter((feature) => feature.is_default_selected).map((feature) => feature.id),
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

    setMessage(form, "[data-create-user-preview]", describePreview(data ?? { error: "Unable to load license preview" }));
  } catch (error) {
    if (requestId !== latestRequestId) {
      return;
    }

    if (error instanceof Error && error.name === "AbortError") {
      return;
    }

    setMessage(form, "[data-create-user-preview]", "Unable to load license preview");
  }
}
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

    setMessage(form, "[data-create-user-status]", "Submitting provisioning request...");

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
              .map(([field, message]) => `${field}: ${message}`)
              .join("; ")}`
          : "";
        setMessage(form, "[data-create-user-status]", `${data?.error ?? "Provisioning failed"}${detailText}`);
        return;
      }

      const warnings = data?.warnings?.length ? ` Warnings: ${data.warnings.join("; ")}` : "";
      setMessage(
        form,
        "[data-create-user-status]",
        `Provisioning request completed${data?.graphUserId ? ` for ${data.graphUserId}` : ""}.${warnings}`.trim(),
      );
    } catch {
      setMessage(form, "[data-create-user-status]", "Unable to submit provisioning request");
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

    setMessage(form, "[data-create-user-preview]", "Loading license preview...");
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
        Provisioning workspace
      </p>
      <h1 style={{ margin: 0, fontSize: "2rem" }}>Create user</h1>
      <p style={{ margin: "0.75rem 0 0", color: "#42526b", lineHeight: 1.6 }}>
        Provision a Microsoft 365 account and record the resulting license decision.
      </p>
      <p style={{ margin: "0.75rem 0 1.5rem", color: "#42526b", lineHeight: 1.6 }}>
        Choose a template, confirm the requested features, preview the matching SKU, and then send the provisioning request.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Display name
          <input
            defaultValue=""
            name="displayName"
            placeholder="Avery Chen"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          User name
          <input
            defaultValue=""
            name="userName"
            placeholder="avery.chen"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          User principal name
          <input
            defaultValue=""
            name="userPrincipalName"
            placeholder="avery.chen@contoso.com"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="email"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Mail nickname
          <input
            defaultValue=""
            name="mailNickname"
            placeholder="avery.chen"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Temporary password
          <input
            defaultValue=""
            name="password"
            placeholder="Password123!"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
            type="password"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Usage location
          <input
            defaultValue={defaultUsageLocation}
            maxLength={2}
            name="usageLocation"
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem", textTransform: "uppercase" }}
            type="text"
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Template preset
          <input defaultValue={JSON.stringify([])} name="selectedTemplateFeatureIds" type="hidden" />
          <select
            defaultValue=""
            name="selectedTemplateId"
            onChange={handleTemplateChange}
            style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
          >
            <option value="">Custom selection</option>
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
          <legend style={{ padding: "0 0.4rem", fontWeight: 600 }}>Template notes</legend>
          {templates.length === 0 ? (
            <p style={{ margin: 0, color: "#42526b" }}>No enabled templates are available yet.</p>
          ) : (
            templates.map((template) => (
              <div key={template.id} style={{ borderRadius: "0.9rem", background: "#f6f9fd", padding: "0.85rem 0.95rem" }}>
                <strong>{template.name}</strong>
                <p style={{ margin: "0.35rem 0 0", color: "#42526b" }}>{template.description || "No description provided."}</p>
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
          <legend style={{ padding: "0 0.4rem", fontWeight: 600 }}>Feature selection</legend>
          {features.length === 0 ? (
            <p style={{ margin: 0, color: "#42526b" }}>No enabled features are available yet.</p>
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
                <span style={{ color: "#42526b" }}>{feature.description || "No description provided."}</span>
              </label>
            ))
          )}
        </fieldset>
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input defaultChecked={false} name="forceChangePasswordNextSignIn" type="checkbox" />
          Force password reset at next sign-in
        </label>
        {captchaEnabled ? (
          <label style={{ display: "grid", gap: "0.35rem" }}>
            CAPTCHA token
            <input
              defaultValue=""
              name="captchaToken"
              placeholder="Paste the challenge token"
              style={{ borderRadius: "0.9rem", border: "1px solid #c8d4e8", padding: "0.8rem 0.9rem" }}
              type="text"
            />
          </label>
        ) : null}
        <p style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          {captchaEnabled
            ? `CAPTCHA is enabled through ${captchaProvider ?? "the configured provider"}.`
            : "CAPTCHA is currently disabled for provisioning requests."}
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
          Preview license
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
          Provision user
        </button>
        <p aria-live="polite" data-create-user-preview="" role="status" style={{ margin: 0, color: "#42526b", lineHeight: 1.6 }}>
          Preview a license decision before submitting.
        </p>
        <p aria-live="polite" data-create-user-status="" role="status" style={{ margin: 0, color: "#173563", lineHeight: 1.6 }}>
          Ready to submit a provisioning request.
        </p>
      </form>
    </section>
  );
}
