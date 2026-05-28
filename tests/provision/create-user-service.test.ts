import { beforeEach, describe, expect, it, vi } from "vitest";
import type { listFeatureRulesByIds as ListFeatureRulesByIds } from "@/lib/supabase/features";
import type { listEnabledTemplatesWithFeatureIds as ListEnabledTemplatesWithFeatureIds } from "@/lib/supabase/templates";

process.env.AZURE_TENANT_ID ??= "tenant-id";
process.env.AZURE_CLIENT_ID ??= "client-id";
process.env.AZURE_CLIENT_SECRET ??= "client-secret";
process.env.SESSION_SECRET ??= "12345678901234567890123456789012";
process.env.DEFAULT_USAGE_LOCATION ??= "US";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.CAPTCHA_ENABLED ??= "false";

const getGraphToken = vi.fn();
const readSessionFromRequest = vi.fn();
const createServerSupabaseClient = vi.fn();
const listEnabledTemplatesWithFeatureIds = vi.fn();
const listVisibleFeatures = vi.fn();
const listFeatureRulesByIds = vi.fn();
const listAssignableSkuCatalog = vi.fn();
const verifyCaptchaToken = vi.fn();
const createProvisionRecord = vi.fn();

vi.mock("@/lib/graph/token", () => ({
  getGraphToken,
}));

vi.mock("@/lib/auth/session", () => ({
  readSessionFromRequest,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/templates", () => ({
  listEnabledTemplatesWithFeatureIds,
}));

vi.mock("@/lib/supabase/features", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/features")>("@/lib/supabase/features");

  return {
    ...actual,
    listVisibleFeatures,
    listFeatureRulesByIds,
  };
});

vi.mock("@/lib/supabase/subscriptions", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/supabase/subscriptions")>("@/lib/supabase/subscriptions");

  return {
    ...actual,
    listAssignableSkuCatalog,
  };
});

vi.mock("@/lib/captcha/verify", () => ({
  verifyCaptchaToken,
}));

vi.mock("@/lib/supabase/records", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/records")>("@/lib/supabase/records");

  return {
    ...actual,
    createProvisionRecord,
  };
});

describe("Graph user helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates a Graph user with the expected payload", async () => {
    getGraphToken.mockResolvedValue("graph-token");
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "graph-123" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const { createGraphUser } = await import("@/lib/graph/users");

    const result = await createGraphUser(
      {
        displayName: "User One",
        mailNickname: "user.one",
        userPrincipalName: "user.one@example.com",
        usageLocation: "US",
        password: "Password123!",
        forceChangePasswordNextSignIn: true,
      },
      fetchImpl,
    );

    expect(getGraphToken).toHaveBeenCalledWith(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://graph.microsoft.com/v1.0/users",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer graph-token",
          "content-type": "application/json",
        }),
      }),
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toEqual({
      accountEnabled: true,
      displayName: "User One",
      mailNickname: "user.one",
      userPrincipalName: "user.one@example.com",
      usageLocation: "US",
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: "Password123!",
      },
    });
    expect(result).toEqual({ id: "graph-123" });
  });

  it("assigns the selected SKU with disabled plans", async () => {
    getGraphToken.mockResolvedValue("graph-token");
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "graph-123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { assignGraphLicense } = await import("@/lib/graph/users");

    const result = await assignGraphLicense("graph-123", "sku-1", ["teams-id"], fetchImpl);

    expect(getGraphToken).toHaveBeenCalledWith(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://graph.microsoft.com/v1.0/users/graph-123/assignLicense",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer graph-token",
          "content-type": "application/json",
        }),
      }),
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toEqual({
      addLicenses: [{ skuId: "sku-1", disabledPlans: ["teams-id"] }],
      removeLicenses: [],
    });
    expect(result).toEqual({ id: "graph-123" });
  });
});

describe("feature and template repository guards", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("listFeatureRulesByIds only resolves rules for enabled features", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "rule-enabled",
          feature_id: "feature-enabled",
          match_type: "servicePlanName",
          match_value: "exchange",
          feature_definitions: {
            key: "exchange",
            name: "Exchange",
          },
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const inFilter = vi.fn(() => ({ eq }));
    const select = vi.fn(() => ({ in: inFilter }));
    const client = {
      from: vi.fn(() => ({ select })),
    } as unknown as Parameters<typeof ListFeatureRulesByIds>[0];

    const actual = await vi.importActual<typeof import("@/lib/supabase/features")>("@/lib/supabase/features");
    const result = await actual.listFeatureRulesByIds(client, ["feature-enabled", "feature-disabled"]);

    expect(client.from).toHaveBeenCalledWith("feature_match_rules");
    expect(select).toHaveBeenCalledWith(
      "id, feature_id, match_type, match_value, feature_definitions!inner(key, name)",
    );
    expect(inFilter).toHaveBeenCalledWith("feature_id", ["feature-enabled", "feature-disabled"]);
    expect(eq).toHaveBeenCalledWith("feature_definitions.is_enabled", true);
    expect(order).toHaveBeenCalledWith("match_value", { ascending: true });
    expect(result).toEqual([
      {
        id: "rule-enabled",
        feature_id: "feature-enabled",
        match_type: "servicePlanName",
        match_value: "exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
      },
    ]);
  });

  it("listEnabledTemplatesWithFeatureIds excludes disabled linked features", async () => {
    const templateOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "template-1",
          key: "mail",
          name: "Mailbox Only",
          description: "Exchange only",
          sort_order: 10,
        },
      ],
      error: null,
    });
    const templateEq = vi.fn(() => ({ order: templateOrder }));
    const templateSelect = vi.fn(() => ({ eq: templateEq }));

    const linkEq = vi.fn().mockResolvedValue({
      data: [
        {
          template_id: "template-1",
          feature_id: "feature-enabled",
        },
      ],
      error: null,
    });
    const linkIn = vi.fn(() => ({ eq: linkEq }));
    const linkSelect = vi.fn(() => ({ in: linkIn }));

    const client = {
      from: vi.fn((table: string) => {
        if (table === "license_templates") {
          return { select: templateSelect };
        }

        if (table === "license_template_features") {
          return { select: linkSelect };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as unknown as Parameters<typeof ListEnabledTemplatesWithFeatureIds>[0];

    const actual =
      await vi.importActual<typeof import("@/lib/supabase/templates")>("@/lib/supabase/templates");
    const result = await actual.listEnabledTemplatesWithFeatureIds(client);

    expect(linkSelect).toHaveBeenCalledWith("template_id, feature_id, feature_definitions!inner(id)");
    expect(linkIn).toHaveBeenCalledWith("template_id", ["template-1"]);
    expect(linkEq).toHaveBeenCalledWith("feature_definitions.is_enabled", true);
    expect(result).toEqual([
      {
        id: "template-1",
        key: "mail",
        name: "Mailbox Only",
        description: "Exchange only",
        sort_order: 10,
        featureIds: ["feature-enabled"],
      },
    ]);
  });
});

describe("GET /api/create-user/options", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when the admin session is missing", async () => {
    readSessionFromRequest.mockResolvedValue(null);

    const { GET } = await import("@/app/api/create-user/options/route");
    const response = await GET(new Request("http://localhost/api/create-user/options"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "未授權" });
  });

  it("returns template, feature, and captcha options for the form", async () => {
    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    listEnabledTemplatesWithFeatureIds.mockResolvedValue([
      {
        id: "template-1",
        key: "mail",
        name: "Mailbox Only",
        description: "Exchange only",
        sort_order: 10,
        featureIds: ["feature-exchange"],
      },
    ]);
    listVisibleFeatures.mockResolvedValue([
      {
        id: "feature-exchange",
        key: "exchange",
        name: "Exchange",
        description: "Mailbox access",
        is_default_selected: true,
        sort_order: 10,
      },
    ]);

    const { GET } = await import("@/app/api/create-user/options/route");
    const response = await GET(new Request("http://localhost/api/create-user/options"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      templates: [
        {
          id: "template-1",
          key: "mail",
          name: "Mailbox Only",
          description: "Exchange only",
          sort_order: 10,
          featureIds: ["feature-exchange"],
        },
      ],
      features: [
        {
          id: "feature-exchange",
          key: "exchange",
          name: "Exchange",
          description: "Mailbox access",
          is_default_selected: true,
          sort_order: 10,
        },
      ],
      captchaEnabled: false,
      captchaProvider: null,
      defaultUsageLocation: "US",
    });
  });
});

describe("POST /api/create-user", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects malformed payloads before provisioning begins", async () => {
    const createGraphUser = vi.fn();
    const assignGraphLicense = vi.fn();
    const createAuditLog = vi.fn();

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "",
          userName: "   ",
          userPrincipalName: "not-an-email",
          mailNickname: 42,
          password: "",
          usageLocation: "USA",
          forceChangePasswordNextSignIn: "yes",
          selectedTemplateId: 123,
          selectedFeatureIds: "feature-exchange",
          captchaToken: 999,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request payload",
      details: {
        displayName: "displayName is required",
        userName: "userName is required",
        userPrincipalName: "userPrincipalName must be a valid email address",
        mailNickname: "mailNickname must be a string when provided",
        password: "password is required",
        usageLocation: "usageLocation must be a 2-letter code",
        forceChangePasswordNextSignIn: "forceChangePasswordNextSignIn must be a boolean",
        selectedTemplateId: "selectedTemplateId must be a string or null when provided",
        selectedFeatureIds: "selectedFeatureIds must be an array of strings",
        captchaToken: "captchaToken must be a string when provided",
      },
    });
    expect(verifyCaptchaToken).not.toHaveBeenCalled();
    expect(listFeatureRulesByIds).not.toHaveBeenCalled();
    expect(listAssignableSkuCatalog).not.toHaveBeenCalled();
    expect(createGraphUser).not.toHaveBeenCalled();
    expect(assignGraphLicense).not.toHaveBeenCalled();
    expect(createProvisionRecord).not.toHaveBeenCalled();
    expect(createAuditLog).not.toHaveBeenCalled();
  });

  it("returns 409 when the selected features no longer map to one assignable SKU", async () => {
    const createGraphUser = vi.fn();
    const assignGraphLicense = vi.fn();
    const createAuditLog = vi.fn();

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    verifyCaptchaToken.mockResolvedValue({ success: true });
    listFeatureRulesByIds.mockResolvedValue([
      {
        id: "rule-exchange",
        feature_id: "feature-exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
        match_type: "servicePlanName",
        match_value: "exchange",
      },
      {
        id: "rule-visio",
        feature_id: "feature-visio",
        feature_key: "visio",
        feature_name: "Visio",
        match_type: "servicePlanName",
        match_value: "visio",
      },
    ]);
    listAssignableSkuCatalog.mockResolvedValue([
      {
        skuId: "sku-mail",
        skuPartNumber: "MAIL_ONLY",
        availableUnits: 4,
        priority: 0,
        servicePlans: ["exchange"],
        servicePlanIds: ["exchange-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
      {
        skuId: "sku-visio",
        skuPartNumber: "VISIO_ONLY",
        availableUnits: 2,
        priority: 0,
        servicePlans: ["visio"],
        servicePlanIds: ["visio-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "User One",
          userName: "user.one",
          userPrincipalName: "user.one@example.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: true,
          selectedTemplateId: "template-1",
          selectedFeatureIds: ["feature-exchange", "feature-visio"],
          captchaToken: "captcha-token",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "No assignable SKU satisfies the selected feature set",
    });
    expect(createGraphUser).not.toHaveBeenCalled();
    expect(assignGraphLicense).not.toHaveBeenCalled();
    expect(createProvisionRecord).toHaveBeenCalledWith(
      { tag: "supabase-client" },
      expect.objectContaining({
        admin_id: "admin-1",
        display_name: "User One",
        user_name: "user.one",
        mail_nickname: "user.one",
        user_principal_name: "user.one@example.com",
        usage_location: "US",
        template_id: "template-1",
        selected_feature_ids: ["feature-exchange", "feature-visio"],
        selected_sku_id: null,
        selected_sku_part_number: null,
        kept_service_plans: [],
        disabled_service_plans: [],
        graph_user_id: null,
        status: "failed",
        error_message: "No assignable SKU satisfies the selected feature set",
      }),
    );
    expect(createAuditLog).not.toHaveBeenCalled();
  });

  it("rejects stale selected features when some feature ids no longer resolve to rules", async () => {
    const createGraphUser = vi.fn();
    const assignGraphLicense = vi.fn();
    const createAuditLog = vi.fn();

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    verifyCaptchaToken.mockResolvedValue({ success: true });
    listFeatureRulesByIds.mockResolvedValue([
      {
        id: "rule-exchange",
        feature_id: "feature-exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
        match_type: "servicePlanName",
        match_value: "exchange",
      },
    ]);
    listAssignableSkuCatalog.mockResolvedValue([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        availableUnits: 12,
        priority: 5,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "User One",
          userName: "user.one",
          userPrincipalName: "user.one@example.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: true,
          selectedTemplateId: "template-1",
          selectedFeatureIds: ["feature-exchange", "feature-missing"],
          captchaToken: "captcha-token",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "One or more selected features are no longer available",
      missingFeatureIds: ["feature-missing"],
    });
    expect(createGraphUser).not.toHaveBeenCalled();
    expect(assignGraphLicense).not.toHaveBeenCalled();
    expect(createProvisionRecord).not.toHaveBeenCalled();
    expect(createAuditLog).not.toHaveBeenCalled();
  });

  it("rejects a disabled feature even if old rules or template links still exist", async () => {
    const createGraphUser = vi.fn();
    const assignGraphLicense = vi.fn();
    const createAuditLog = vi.fn();

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    verifyCaptchaToken.mockResolvedValue({ success: true });
    listFeatureRulesByIds.mockResolvedValue([
      {
        id: "rule-exchange",
        feature_id: "feature-exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
        match_type: "servicePlanName",
        match_value: "exchange",
      },
    ]);
    listAssignableSkuCatalog.mockResolvedValue([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        availableUnits: 12,
        priority: 5,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "User One",
          userName: "user.one",
          userPrincipalName: "user.one@example.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: true,
          selectedTemplateId: "template-1",
          selectedFeatureIds: ["feature-exchange", "feature-disabled"],
          captchaToken: "captcha-token",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "One or more selected features are no longer available",
      missingFeatureIds: ["feature-disabled"],
    });
    expect(createGraphUser).not.toHaveBeenCalled();
    expect(assignGraphLicense).not.toHaveBeenCalled();
    expect(createProvisionRecord).not.toHaveBeenCalled();
    expect(createAuditLog).not.toHaveBeenCalled();
  });

  it("creates the user, assigns the license, records success, and writes an audit log", async () => {
    const createGraphUser = vi.fn().mockResolvedValue({ id: "graph-123" });
    const assignGraphLicense = vi.fn().mockResolvedValue({ ok: true });
    const createAuditLog = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    verifyCaptchaToken.mockResolvedValue({ success: true });
    listFeatureRulesByIds.mockResolvedValue([
      {
        id: "rule-exchange",
        feature_id: "feature-exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
        match_type: "servicePlanName",
        match_value: "exchange",
      },
    ]);
    listAssignableSkuCatalog.mockResolvedValue([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        availableUnits: 12,
        priority: 5,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "User One",
          userName: "user.one",
          userPrincipalName: "user.one@example.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: true,
          selectedTemplateId: "template-1",
          selectedFeatureIds: ["feature-exchange"],
          captchaToken: "captcha-token",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      graphUserId: "graph-123",
    });
    expect(createGraphUser).toHaveBeenCalledWith({
      displayName: "User One",
      mailNickname: "user.one",
      userPrincipalName: "user.one@example.com",
      usageLocation: "US",
      password: "Password123!",
      forceChangePasswordNextSignIn: true,
    });
    expect(assignGraphLicense).toHaveBeenCalledWith("graph-123", "sku-1", ["teams-id"]);
    expect(createProvisionRecord).toHaveBeenCalledWith(
      { tag: "supabase-client" },
      {
        admin_id: "admin-1",
        display_name: "User One",
        user_name: "user.one",
        mail_nickname: "user.one",
        user_principal_name: "user.one@example.com",
        usage_location: "US",
        template_id: "template-1",
        selected_feature_ids: ["feature-exchange"],
        resolved_feature_snapshot: [
          {
            featureId: "feature-exchange",
            featureKey: "exchange",
            featureName: "Exchange",
            planNames: ["exchange"],
            planIds: [],
          },
        ],
        selected_sku_id: "sku-1",
        selected_sku_part_number: "M365_E3",
        kept_service_plans: ["exchange-id"],
        disabled_service_plans: ["teams-id"],
        graph_user_id: "graph-123",
        status: "success",
        error_message: null,
      },
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      { tag: "supabase-client" },
      {
        admin_id: "admin-1",
        action: "create_user",
        entity_type: "graph_user",
        entity_id: "graph-123",
        payload: {
          status: "success",
          userPrincipalName: "user.one@example.com",
          skuId: "sku-1",
        },
      },
    );
  });

  it("keeps a Graph-side success response even when record and audit persistence fail", async () => {
    const createGraphUser = vi.fn().mockResolvedValue({ id: "graph-123" });
    const assignGraphLicense = vi.fn().mockResolvedValue({ ok: true });
    const createAuditLog = vi.fn().mockRejectedValue(new Error("audit write failed"));

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    verifyCaptchaToken.mockResolvedValue({ success: true });
    listFeatureRulesByIds.mockResolvedValue([
      {
        id: "rule-exchange",
        feature_id: "feature-exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
        match_type: "servicePlanName",
        match_value: "exchange",
      },
    ]);
    listAssignableSkuCatalog.mockResolvedValue([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        availableUnits: 12,
        priority: 5,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);
    createProvisionRecord.mockRejectedValue(new Error("record write failed"));

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "User One",
          userName: "user.one",
          userPrincipalName: "user.one@example.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: true,
          selectedTemplateId: "template-1",
          selectedFeatureIds: ["feature-exchange"],
          captchaToken: "captcha-token",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      graphUserId: "graph-123",
      warnings: ["Failed to persist provisioning record", "Failed to persist audit log"],
    });
    expect(createGraphUser).toHaveBeenCalledOnce();
    expect(assignGraphLicense).toHaveBeenCalledWith("graph-123", "sku-1", ["teams-id"]);
    expect(createProvisionRecord).toHaveBeenCalledOnce();
    expect(createAuditLog).toHaveBeenCalledOnce();
  });

  it("stores a partial-success record when the user is created but license assignment fails", async () => {
    const createGraphUser = vi.fn().mockResolvedValue({ id: "graph-123" });
    const assignGraphLicense = vi.fn().mockRejectedValue(new Error("assignLicense failed"));
    const createAuditLog = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/graph/users", () => ({
      createGraphUser,
      assignGraphLicense,
    }));

    vi.doMock("@/lib/audit/log", () => ({
      createAuditLog,
    }));

    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    verifyCaptchaToken.mockResolvedValue({ success: true });
    listFeatureRulesByIds.mockResolvedValue([
      {
        id: "rule-exchange",
        feature_id: "feature-exchange",
        feature_key: "exchange",
        feature_name: "Exchange",
        match_type: "servicePlanName",
        match_value: "exchange",
      },
    ]);
    listAssignableSkuCatalog.mockResolvedValue([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        availableUnits: 12,
        priority: 5,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);

    const { POST } = await import("@/app/api/create-user/route");
    const response = await POST(
      new Request("http://localhost/api/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "User One",
          userName: "user.one",
          userPrincipalName: "user.one@example.com",
          mailNickname: "",
          password: "Password123!",
          usageLocation: "US",
          forceChangePasswordNextSignIn: true,
          selectedTemplateId: "template-1",
          selectedFeatureIds: ["feature-exchange"],
          captchaToken: "captcha-token",
        }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "assignLicense failed",
      graphUserId: "graph-123",
      warnings: ["Failed to persist provisioning record"],
    });
    expect(createProvisionRecord).toHaveBeenCalledWith(
      { tag: "supabase-client" },
      {
        admin_id: "admin-1",
        display_name: "User One",
        user_name: "user.one",
        mail_nickname: "user.one",
        user_principal_name: "user.one@example.com",
        usage_location: "US",
        template_id: "template-1",
        selected_feature_ids: ["feature-exchange"],
        resolved_feature_snapshot: [
          {
            featureId: "feature-exchange",
            featureKey: "exchange",
            featureName: "Exchange",
            planNames: ["exchange"],
            planIds: [],
          },
        ],
        selected_sku_id: "sku-1",
        selected_sku_part_number: "M365_E3",
        kept_service_plans: ["exchange-id"],
        disabled_service_plans: ["teams-id"],
        graph_user_id: "graph-123",
        status: "partial_success",
        error_message: "assignLicense failed",
      },
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      { tag: "supabase-client" },
      {
        admin_id: "admin-1",
        action: "create_user",
        entity_type: "graph_user",
        entity_id: "graph-123",
        payload: {
          status: "partial_success",
          userPrincipalName: "user.one@example.com",
          skuId: "sku-1",
          error: "assignLicense failed",
        },
      },
    );
  });
});
