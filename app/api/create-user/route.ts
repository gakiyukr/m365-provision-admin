import { NextResponse } from "next/server";
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
    return "無法寫入建立記錄";
  }
}

async function persistAuditLog(client: ReturnType<typeof createServerSupabaseClient>, entry: Parameters<typeof createAuditLog>[1]) {
  try {
    await createAuditLog(client, entry);
    return null;
  } catch {
    return "無法寫入稽核記錄";
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
        body: "請求內容必須是 JSON 物件",
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
    details.displayName = "必填";
  }

  if (!userName) {
    details.userName = "必填";
  }

  if (!userPrincipalName || !isValidEmailAddress(userPrincipalName)) {
    details.userPrincipalName = "必須是有效的電子郵件地址";
  }

  if (mailNickname === null) {
    details.mailNickname = "若提供郵件別名，必須是字串";
  }

  if (!password) {
    details.password = "必填";
  }

  if (!/^[A-Za-z]{2}$/.test(usageLocation)) {
    details.usageLocation = "必須是 2 碼地區代號";
  }

  if (typeof candidate.forceChangePasswordNextSignIn !== "boolean") {
    details.forceChangePasswordNextSignIn = "必須是布林值";
  }

  if (selectedTemplateId === undefined) {
    details.selectedTemplateId = "若提供模板 ID，必須是字串或 null";
  }

  if (candidate.selectedFeatureIds !== undefined && !Array.isArray(candidate.selectedFeatureIds)) {
    details.selectedFeatureIds = "必須是字串陣列";
  } else if (Array.isArray(candidate.selectedFeatureIds) && selectedFeatureIds.length !== candidate.selectedFeatureIds.length) {
    details.selectedFeatureIds = "必須是字串陣列";
  }

  if (captchaToken === null) {
    details.captchaToken = "若提供 CAPTCHA Token，必須是字串";
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
  try {
    const payloadResult = validateCreateUserRequestBody(await request.json());

    if (!payloadResult.ok) {
      return NextResponse.json(
        {
          error: "請求內容格式不正確",
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
      return NextResponse.json({ error: "CAPTCHA 驗證失敗" }, { status: 400 });
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
          error: "一個或多個已選功能項目前已不可用",
          missingFeatureIds,
        },
        { status: 409 },
      );
    }

    const resolved = resolveFeatureSelection(rules);
    const selectedSku = pickBestSku(catalog, resolved.planNames, resolved.planIds);

    if (!selectedSku) {
      const message = "沒有可分配的 SKU 能滿足所選功能項";

      await persistProvisionRecord(client, {
        admin_id: null,
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
          admin_id: null,
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
          admin_id: null,
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
      const message = error instanceof Error ? error.message : "建立使用者流程失敗";
      const warnings = [
        await persistProvisionRecord(client, {
          admin_id: null,
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
          admin_id: null,
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
      { error: error instanceof Error ? error.message : "無法建立使用者" },
      { status: 500 },
    );
  }
}
