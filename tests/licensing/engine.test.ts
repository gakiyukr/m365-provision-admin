import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.AZURE_TENANT_ID ??= "tenant-id";
process.env.AZURE_CLIENT_ID ??= "client-id";
process.env.AZURE_CLIENT_SECRET ??= "client-secret";
process.env.SESSION_SECRET ??= "12345678901234567890123456789012";
process.env.DEFAULT_USAGE_LOCATION ??= "US";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.CAPTCHA_ENABLED ??= "false";

const createServerSupabaseClient = vi.fn();
const listFeatureRulesByIds = vi.fn();
const listAssignableSkuCatalog = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/features", () => ({
  listFeatureRulesByIds,
}));

vi.mock("@/lib/supabase/subscriptions", () => ({
  listAssignableSkuCatalog,
}));

describe("listAssignableSkuCatalog", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("requires an explicit assignable policy row", async () => {
    const { listAssignableSkuCatalog: actualListAssignableSkuCatalog } =
      await vi.importActual<typeof import("@/lib/supabase/subscriptions")>("@/lib/supabase/subscriptions");

    const client = {
      from: vi.fn((table: string) => {
        if (table === "graph_subscriptions") {
          return {
            select: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "sub-1",
                    sku_id: "sku-1",
                    sku_part_number: "M365_E3",
                    capability_status: "Enabled",
                    applies_to: "User",
                    enabled_units: 10,
                    warning_units: 0,
                    consumed_units: 2,
                    available_units: 8,
                    raw_payload: {},
                    synced_at: "2026-05-27T00:00:00.000Z",
                  },
                ],
                error: null,
              }),
            })),
          };
        }

        if (table === "graph_service_plans") {
          return {
            select: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "plan-1",
                    sku_id: "sku-1",
                    service_plan_id: "exchange-id",
                    service_plan_name: "exchange",
                    provisioning_status: "Success",
                    applies_to: "User",
                    raw_payload: {},
                    synced_at: "2026-05-27T00:00:00.000Z",
                  },
                ],
                error: null,
              }),
            })),
          };
        }

        if (table === "subscription_policies") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }

        if (table === "service_plan_policies") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as unknown as Parameters<typeof actualListAssignableSkuCatalog>[0];

    const result = await actualListAssignableSkuCatalog(client);
    expect(result).toEqual([]);
  });
});

describe("pickBestSku", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("prefers the candidate with fewer eventually enabled extras after forced keeps", async () => {
    const { pickBestSku } =
      await import("@/lib/licensing/engine");

    const targetPlans = new Set(["exchange"]);
    const candidates = [
      {
        skuId: "forced-extra",
        priority: 10,
        availableUnits: 50,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: ["teams-id"],
        forbiddenServicePlanIds: [],
      },
      {
        skuId: "disableable-extras",
        priority: 0,
        availableUnits: 1,
        servicePlans: ["exchange", "sharepoint", "onedrive"],
        servicePlanIds: ["exchange-id", "sharepoint-id", "onedrive-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ];

    const selected = pickBestSku(candidates, targetPlans);
    expect(selected?.skuId).toBe("disableable-extras");
  });

  it("rejects candidates blocked by forbidden plans and falls back to the next best match", async () => {
    const { pickBestSku } =
      await import("@/lib/licensing/engine");

    const targetPlans = new Set(["exchange"]);
    const candidates = [
      {
        skuId: "forbidden",
        priority: 10,
        availableUnits: 10,
        servicePlans: ["exchange"],
        servicePlanIds: ["exchange-plan-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: ["exchange-plan-id"],
      },
      {
        skuId: "allowed",
        priority: 0,
        availableUnits: 1,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-plan-id", "teams-plan-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: ["sharepoint-plan-id"],
      },
    ];

    const selected = pickBestSku(candidates, targetPlans, new Set(["exchange-plan-id"]));
    expect(selected?.skuId).toBe("allowed");
  });

  it("uses priority before available seats when extras are equal", async () => {
    const { pickBestSku } =
      await import("@/lib/licensing/engine");

    const targetPlans = new Set(["exchange", "teams"]);
    const candidates = [
      {
        skuId: "high-seats",
        priority: 1,
        availableUnits: 20,
        servicePlans: ["exchange", "teams", "sharepoint"],
        servicePlanIds: ["exchange-id", "teams-id", "sharepoint-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
      {
        skuId: "high-priority",
        priority: 5,
        availableUnits: 2,
        servicePlans: ["exchange", "teams", "visio"],
        servicePlanIds: ["exchange-id", "teams-id", "visio-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ];

    const selected = pickBestSku(candidates, targetPlans);
    expect(selected?.skuId).toBe("high-priority");
  });
});

describe("buildDisabledPlans", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("keeps selected and forced plans, disabling everything else", async () => {
    const { buildDisabledPlans } =
      await import("@/lib/licensing/engine");

    const result = buildDisabledPlans({
      skuServicePlans: [
        { servicePlanId: "exchange-id", servicePlanName: "exchange" },
        { servicePlanId: "teams-id", servicePlanName: "teams" },
        { servicePlanId: "sharepoint-id", servicePlanName: "sharepoint" },
      ],
      selectedPlanNames: new Set(["exchange"]),
      selectedPlanIds: new Set(),
      forcedKeepPlanIds: new Set(["teams-id"]),
    });

    expect(result.keptPlans).toEqual(["exchange-id", "teams-id"]);
    expect(result.disabledPlans).toEqual(["sharepoint-id"]);
    expect(result.enabledApplications).toEqual(["exchange", "teams"]);
  });

  it("treats service-plan-id matches as selected plans", async () => {
    const { buildDisabledPlans } =
      await import("@/lib/licensing/engine");

    const result = buildDisabledPlans({
      skuServicePlans: [
        { servicePlanId: "exchange-id", servicePlanName: "exchange" },
        { servicePlanId: "teams-id", servicePlanName: "teams" },
      ],
      selectedPlanNames: new Set(),
      selectedPlanIds: new Set(["teams-id"]),
      forcedKeepPlanIds: new Set(),
    });

    expect(result.keptPlans).toEqual(["teams-id"]);
    expect(result.disabledPlans).toEqual(["exchange-id"]);
    expect(result.enabledApplications).toEqual(["teams"]);
  });
});

describe("POST /api/license-preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns the selected SKU, enabled applications, and unavailable features", async () => {
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
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
        id: "rule-teams",
        feature_id: "feature-teams",
        feature_key: "teams",
        feature_name: "Teams",
        match_type: "servicePlanId",
        match_value: "teams-id",
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
        skuId: "sku-tight",
        skuPartNumber: "M365_TIGHT",
        availableUnits: 3,
        priority: 5,
        servicePlans: ["exchange", "teams"],
        servicePlanIds: ["exchange-id", "teams-id"],
        forcedKeepServicePlanIds: ["exchange-id"],
        forbiddenServicePlanIds: [],
      },
      {
        skuId: "sku-visio",
        skuPartNumber: "M365_VISIO",
        availableUnits: 1,
        priority: 1,
        servicePlans: ["exchange", "teams", "visio"],
        servicePlanIds: ["exchange-id", "teams-id", "visio-id"],
        forcedKeepServicePlanIds: [],
        forbiddenServicePlanIds: [],
      },
    ]);

    const { POST } = await import("@/app/api/license-preview/route");
    const response = await POST(
      new Request("http://localhost/api/license-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featureIds: ["feature-exchange", "feature-teams", "feature-visio"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      selectedSku: {
        skuId: "sku-visio",
        skuPartNumber: "M365_VISIO",
      },
      enabledApplications: ["exchange", "teams", "visio"],
      disabledServicePlanIds: [],
      unavailableFeatures: [],
      failureReason: null,
      targetPlans: {
        names: ["exchange", "visio"],
        ids: ["teams-id"],
      },
    });
    expect(listFeatureRulesByIds).toHaveBeenCalledWith(
      { tag: "supabase-client" },
      ["feature-exchange", "feature-teams", "feature-visio"],
    );
    expect(listAssignableSkuCatalog).toHaveBeenCalledWith({ tag: "supabase-client" });
  });

  it("reports unavailable features when no SKU can satisfy them", async () => {
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
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
    ]);

    const { POST } = await import("@/app/api/license-preview/route");
    const response = await POST(
      new Request("http://localhost/api/license-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featureIds: ["feature-exchange", "feature-visio"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      selectedSku: null,
      enabledApplications: [],
      disabledServicePlanIds: [],
      unavailableFeatures: [
        {
          featureId: "feature-visio",
          featureKey: "visio",
          featureName: "Visio",
        },
      ],
      failureReason: "unavailable_features",
      targetPlans: {
        names: ["exchange", "visio"],
        ids: [],
      },
    });
  });

  it("reports a combination failure when features are individually satisfiable but not by one SKU", async () => {
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
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

    const { POST } = await import("@/app/api/license-preview/route");
    const response = await POST(
      new Request("http://localhost/api/license-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featureIds: ["feature-exchange", "feature-visio"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      selectedSku: null,
      enabledApplications: [],
      disabledServicePlanIds: [],
      unavailableFeatures: [],
      failureReason: "no_single_sku_covers_selection",
      targetPlans: {
        names: ["exchange", "visio"],
        ids: [],
      },
    });
  });
});
