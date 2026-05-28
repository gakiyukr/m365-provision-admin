import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/log";
import { verifyCaptchaToken } from "@/lib/captcha/verify";
import { assignGraphLicense, createGraphUser } from "@/lib/graph/users";
import { buildDisabledPlans, pickBestSku, resolveFeatureSelection } from "@/lib/licensing/engine";
import { listFeatureRulesByIds } from "@/lib/supabase/features";
import { createProvisionRecord } from "@/lib/supabase/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listAssignableSkuCatalog } from "@/lib/supabase/subscriptions";

type CreateUserRequestBody = {
  displayName?: string;
  userName?: string;
  userPrincipalName?: string;
  mailNickname?: string;
  password?: string;
  usageLocation?: string;
  forceChangePasswordNextSignIn?: boolean;
  selectedTemplateId?: string | null;
  selectedFeatureIds?: string[];
  captchaToken?: string;
};

type CaptchaProvider = "turnstile" | "hcaptcha" | "recaptcha_v2";
type ValidationErrorDetails = Record<string, string>;
type ValidCreateUserRequestBody = {
  displayName: string;
  userName: string;
  userPrincipalName: string;
  mailNickname: string;
  password: string;
  usageLocation: string;
  forceChangePasswordNextSignIn: boolean;
  selectedTemplateId: string | null;
  selectedFeatureIds: string[];
  captchaToken: string;
};

function normalizeFeatureIds(featureIds: CreateUserRequestBody["selectedFeatureIds"]) {
  return Array.isArray(featureIds)
    ? featureIds.filter((featureId): featureId is string => typeof featureId === "string" && featureId.length > 0)
    : [];
}

function getRemoteIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}

async function persistProvisionRecord(
  client: ReturnType<typeof createServerSupabaseClient>,
  record: Parameters<typeof createProvisionRecord>[1],
) {
  try {
    await createProvisionRecord(client, record);
    return null;
  } catch {
    return "Failed to persist provisioning record";
  }
}

async function persistAuditLog(client: ReturnType<typeof createServerSupabaseClient>, entry: Parameters<typeof createAuditLog>[1]) {
  try {
    await createAuditLog(client, entry);
    return null;
  } catch {
    return "Failed to persist audit log";
  }
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCreateUserRequestBody(body: unknown) {
  const details: ValidationErrorDetails = {};

  if (!body || typeof body !== "object") {
    return {
      ok: false as const,
      details: {
        body: "Request body must be a JSON object",
      },
    };
  }

  const candidate = body as CreateUserRequestBody;
  const displayName = typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";
  const userName = typeof candidate.userName === "string" ? candidate.userName.trim() : "";
  const userPrincipalName =
    typeof candidate.userPrincipalName === "string" ? candidate.userPrincipalName.trim() : "";
  const mailNickname =
    candidate.mailNickname === undefined
      ? ""
      : typeof candidate.mailNickname === "string"
        ? candidate.mailNickname.trim()
        : null;
  const password = typeof candidate.password === "string" ? candidate.password : "";
  const usageLocation = typeof candidate.usageLocation === "string" ? candidate.usageLocation.trim() : "";
  const selectedTemplateId =
    candidate.selectedTemplateId === undefined || candidate.selectedTemplateId === null
      ? null
      : typeof candidate.selectedTemplateId === "string"
        ? candidate.selectedTemplateId
        : undefined;
  const selectedFeatureIds = normalizeFeatureIds(candidate.selectedFeatureIds);
  const captchaToken =
    candidate.captchaToken === undefined ? "" : typeof candidate.captchaToken === "string" ? candidate.captchaToken : null;

  if (!displayName) {
    details.displayName = "displayName is required";
  }

  if (!userName) {
    details.userName = "userName is required";
  }

  if (!userPrincipalName || !isValidEmailAddress(userPrincipalName)) {
    details.userPrincipalName = "userPrincipalName must be a valid email address";
  }

  if (mailNickname === null) {
    details.mailNickname = "mailNickname must be a string when provided";
  }

  if (!password) {
    details.password = "password is required";
  }

  if (!/^[A-Za-z]{2}$/.test(usageLocation)) {
    details.usageLocation = "usageLocation must be a 2-letter code";
  }

  if (typeof candidate.forceChangePasswordNextSignIn !== "boolean") {
    details.forceChangePasswordNextSignIn = "forceChangePasswordNextSignIn must be a boolean";
  }

  if (selectedTemplateId === undefined) {
    details.selectedTemplateId = "selectedTemplateId must be a string or null when provided";
  }

  if (candidate.selectedFeatureIds !== undefined && !Array.isArray(candidate.selectedFeatureIds)) {
    details.selectedFeatureIds = "selectedFeatureIds must be an array of strings";
  } else if (Array.isArray(candidate.selectedFeatureIds) && selectedFeatureIds.length !== candidate.selectedFeatureIds.length) {
    details.selectedFeatureIds = "selectedFeatureIds must be an array of strings";
  }

  if (captchaToken === null) {
    details.captchaToken = "captchaToken must be a string when provided";
  }

  if (Object.keys(details).length > 0) {
    return {
      ok: false as const,
      details,
    };
  }

  return {
    ok: true as const,
    value: {
      displayName,
      userName,
      userPrincipalName,
      mailNickname: mailNickname || userName,
      password,
      usageLocation: usageLocation.toUpperCase(),
      forceChangePasswordNextSignIn: candidate.forceChangePasswordNextSignIn as boolean,
      selectedTemplateId: selectedTemplateId ?? null,
      selectedFeatureIds,
      captchaToken: captchaToken ?? "",
    } satisfies ValidCreateUserRequestBody,
  };
}

export async function POST(request: Request) {
  const admin = await readSessionFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payloadResult = validateCreateUserRequestBody(await request.json());

    if (!payloadResult.ok) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: payloadResult.details,
        },
        { status: 400 },
      );
    }

    const body = payloadResult.value;
    const client = createServerSupabaseClient();
    const selectedFeatureIds = body.selectedFeatureIds;
    const mailNickname = body.mailNickname;
    const templateId = body.selectedTemplateId;
    const userPrincipalName = body.userPrincipalName;
    const captchaProvider = process.env.CAPTCHA_PROVIDER;
    const normalizedCaptchaProvider =
      captchaProvider === "turnstile" || captchaProvider === "hcaptcha" || captchaProvider === "recaptcha_v2"
        ? captchaProvider
        : null;

    const captchaEnabled = process.env.CAPTCHA_ENABLED === "true";
    const captchaResult = await verifyCaptchaToken({
      enabled: captchaEnabled,
      provider: captchaEnabled ? (normalizedCaptchaProvider as CaptchaProvider | null) : null,
      secret: captchaEnabled ? process.env.CAPTCHA_SECRET ?? null : null,
      token: body.captchaToken,
      remoteIp: getRemoteIp(request),
    });

    if (!captchaResult.success) {
      return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
    }

    const [rules, catalog] = await Promise.all([
      listFeatureRulesByIds(client, selectedFeatureIds),
      listAssignableSkuCatalog(client),
    ]);

    const resolvedFeatureIds = new Set(rules.map((rule) => rule.feature_id));
    const missingFeatureIds = selectedFeatureIds.filter((featureId) => !resolvedFeatureIds.has(featureId));

    if (missingFeatureIds.length > 0) {
      return NextResponse.json(
        {
          error: "One or more selected features are no longer available",
          missingFeatureIds,
        },
        { status: 409 },
      );
    }

    const resolved = resolveFeatureSelection(rules);
    const selectedSku = pickBestSku(catalog, resolved.planNames, resolved.planIds);

    if (!selectedSku) {
      const message = "No assignable SKU satisfies the selected feature set";

      await persistProvisionRecord(client, {
        admin_id: admin.adminId,
        display_name: body.displayName,
        user_name: body.userName,
        mail_nickname: mailNickname,
        user_principal_name: userPrincipalName,
        usage_location: body.usageLocation,
        template_id: templateId,
        selected_feature_ids: selectedFeatureIds,
        resolved_feature_snapshot: resolved.features,
        selected_sku_id: null,
        selected_sku_part_number: null,
        kept_service_plans: [],
        disabled_service_plans: [],
        graph_user_id: null,
        status: "failed",
        error_message: message,
      });

      return NextResponse.json({ error: message }, { status: 409 });
    }

    const planResult = buildDisabledPlans({
      skuServicePlans: selectedSku.servicePlanIds.map((servicePlanId, index) => ({
        servicePlanId,
        servicePlanName: selectedSku.servicePlans[index] ?? servicePlanId,
      })),
      selectedPlanNames: resolved.planNames,
      selectedPlanIds: resolved.planIds,
      forcedKeepPlanIds: new Set(selectedSku.forcedKeepServicePlanIds),
    });

    const graphUser = await createGraphUser({
      displayName: body.displayName,
      mailNickname,
      userPrincipalName,
      usageLocation: body.usageLocation,
      password: body.password,
      forceChangePasswordNextSignIn: body.forceChangePasswordNextSignIn,
    });

    const graphUserId = typeof graphUser.id === "string" ? graphUser.id : "";

    try {
      await assignGraphLicense(graphUserId, selectedSku.skuId, planResult.disabledPlans);

      const warnings = [
        await persistProvisionRecord(client, {
          admin_id: admin.adminId,
          display_name: body.displayName,
          user_name: body.userName,
          mail_nickname: mailNickname,
          user_principal_name: userPrincipalName,
          usage_location: body.usageLocation,
          template_id: templateId,
          selected_feature_ids: selectedFeatureIds,
          resolved_feature_snapshot: resolved.features,
          selected_sku_id: selectedSku.skuId,
          selected_sku_part_number: selectedSku.skuPartNumber,
          kept_service_plans: planResult.keptPlans,
          disabled_service_plans: planResult.disabledPlans,
          graph_user_id: graphUserId,
          status: "success",
          error_message: null,
        }),
        await persistAuditLog(client, {
          admin_id: admin.adminId,
          action: "create_user",
          entity_type: "graph_user",
          entity_id: graphUserId,
          payload: {
            status: "success",
            userPrincipalName,
            skuId: selectedSku.skuId,
          },
        }),
      ].filter((warning): warning is string => warning !== null);

      return NextResponse.json(
        warnings.length > 0
          ? {
              ok: true,
              graphUserId,
              warnings,
            }
          : { ok: true, graphUserId },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provisioning failed";
      const warnings = [
        await persistProvisionRecord(client, {
          admin_id: admin.adminId,
          display_name: body.displayName,
          user_name: body.userName,
          mail_nickname: mailNickname,
          user_principal_name: userPrincipalName,
          usage_location: body.usageLocation,
          template_id: templateId,
          selected_feature_ids: selectedFeatureIds,
          resolved_feature_snapshot: resolved.features,
          selected_sku_id: selectedSku.skuId,
          selected_sku_part_number: selectedSku.skuPartNumber,
          kept_service_plans: planResult.keptPlans,
          disabled_service_plans: planResult.disabledPlans,
          graph_user_id: graphUserId,
          status: "partial_success",
          error_message: message,
        }),
        await persistAuditLog(client, {
          admin_id: admin.adminId,
          action: "create_user",
          entity_type: "graph_user",
          entity_id: graphUserId,
          payload: {
            status: "partial_success",
            userPrincipalName,
            skuId: selectedSku.skuId,
            error: message,
          },
        }),
      ].filter((warning): warning is string => warning !== null);

      return NextResponse.json(
        warnings.length > 0
          ? {
              error: message,
              graphUserId,
              warnings,
            }
          : { error: message, graphUserId },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 },
    );
  }
}
