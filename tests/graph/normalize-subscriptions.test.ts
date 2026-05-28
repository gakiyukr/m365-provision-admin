import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphRequest, listGraphSubscribedSkus } from "@/lib/graph/client";
import { normalizeSubscribedSkus } from "@/lib/graph/subscriptions";
import { getGraphToken } from "@/lib/graph/token";

process.env.AZURE_TENANT_ID ??= "tenant-id";
process.env.AZURE_CLIENT_ID ??= "client-id";
process.env.AZURE_CLIENT_SECRET ??= "client-secret";
process.env.SESSION_SECRET ??= "12345678901234567890123456789012";
process.env.DEFAULT_USAGE_LOCATION ??= "US";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.CAPTCHA_ENABLED ??= "false";

const readSessionFromRequest = vi.fn();
const createServerSupabaseClient = vi.fn();
const listSubscriptionCatalog = vi.fn();
const syncGraphSubscriptionsMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  readSessionFromRequest,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

vi.mock("@/lib/supabase/subscriptions", () => ({
  listSubscriptionCatalog,
}));

vi.mock("@/lib/sync/subscriptions", () => ({
  syncGraphSubscriptions: syncGraphSubscriptionsMock,
}));

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    statusText: init?.statusText,
  });
}

function createSupabaseClientDouble(args?: {
  existingSubscriptions?: Array<{ sku_id: string }>;
  existingServicePlans?: Array<{ sku_id: string; service_plan_id: string }>;
  upsertSubscriptionError?: Error | null;
  upsertServicePlanError?: Error | null;
  deleteSubscriptionError?: Error | null;
  deleteServicePlanError?: Error | null;
  insertJobError?: Error | null;
}) {
  const existingSubscriptions = args?.existingSubscriptions ?? [];
  const existingServicePlans = args?.existingServicePlans ?? [];
  const subscriptionDeleteCalls: string[][] = [];
  const servicePlanDeleteCalls: Array<{ skuId: string; servicePlanIds: string[] }> = [];

  const graphSubscriptionsDeleteIn = vi.fn(async (_column: string, values: string[]) => {
    subscriptionDeleteCalls.push([...values]);
    return { error: args?.deleteSubscriptionError ?? null };
  });
  const graphSubscriptionsDelete = vi.fn(() => ({
    in: graphSubscriptionsDeleteIn,
  }));

  const graphServicePlansDelete = vi.fn(() => ({
    eq: vi.fn((_column: string, skuId: string) => ({
      in: vi.fn(async (_inColumn: string, values: string[]) => {
        servicePlanDeleteCalls.push({ skuId, servicePlanIds: [...values] });
        return { error: args?.deleteServicePlanError ?? null };
      }),
    })),
  }));

  const graphSubscriptionsTable = {
    select: vi.fn(async () => ({
      data: existingSubscriptions,
      error: null,
    })),
    upsert: vi.fn(async () => ({
      error: args?.upsertSubscriptionError ?? null,
    })),
    delete: graphSubscriptionsDelete,
  };

  const graphServicePlansTable = {
    select: vi.fn(async () => ({
      data: existingServicePlans,
      error: null,
    })),
    upsert: vi.fn(async () => ({
      error: args?.upsertServicePlanError ?? null,
    })),
    delete: graphServicePlansDelete,
  };

  const graphSyncJobsTable = {
    insert: vi.fn(async () => ({
      error: args?.insertJobError ?? null,
    })),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "graph_subscriptions") {
        return graphSubscriptionsTable;
      }

      if (table === "graph_service_plans") {
        return graphServicePlansTable;
      }

      if (table === "graph_sync_jobs") {
        return graphSyncJobsTable;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    client,
    graphSubscriptionsTable,
    graphServicePlansTable,
    graphSyncJobsTable,
    subscriptionDeleteCalls,
    servicePlanDeleteCalls,
  };
}

describe("normalizeSubscribedSkus", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calculates available seats and flattens service plans", () => {
    const result = normalizeSubscribedSkus([
      {
        skuId: "sku-1",
        skuPartNumber: "M365_E3",
        capabilityStatus: "Enabled",
        appliesTo: "User",
        consumedUnits: 8,
        prepaidUnits: { enabled: 10, warning: 1 },
        servicePlans: [{ servicePlanId: "plan-1", servicePlanName: "EXCHANGE_S_FOUNDATION" }],
      },
    ]);

    expect(result.subscriptions[0].available_units).toBe(3);
    expect(result.servicePlans[0].service_plan_name).toBe("EXCHANGE_S_FOUNDATION");
  });

  it("drops items that do not have required subscription or service plan identifiers", () => {
    const result = normalizeSubscribedSkus([
      {
        skuPartNumber: "NO_SKU_ID",
        servicePlans: [{ servicePlanId: "plan-missing-parent" }],
      },
      {
        skuId: "sku-2",
        skuPartNumber: "M365_F3",
        servicePlans: [{ servicePlanName: "MISSING_PLAN_ID" }],
      },
    ]);

    expect(result.subscriptions).toHaveLength(1);
    expect(result.subscriptions[0].sku_id).toBe("sku-2");
    expect(result.servicePlans).toHaveLength(0);
  });
});

describe("getGraphToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("posts the client-credentials form and returns the access token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ access_token: "graph-token" }));

    await expect(getGraphToken(fetchMock)).resolves.toBe("graph-token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/tenant-id/oauth2/v2.0/token");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("content-type")).toBe("application/x-www-form-urlencoded");

    const params = new URLSearchParams(String(init.body));
    expect(params.get("client_id")).toBe("client-id");
    expect(params.get("client_secret")).toBe("client-secret");
    expect(params.get("scope")).toBe("https://graph.microsoft.com/.default");
    expect(params.get("grant_type")).toBe("client_credentials");
  });

  it("surfaces Graph token errors from the response body", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: "invalid_client",
          error_description: "Tenant rejected the client secret",
        },
        { status: 401, statusText: "Unauthorized" },
      ),
    );

    await expect(getGraphToken(fetchMock)).rejects.toThrow("Tenant rejected the client secret");
  });
});

describe("Graph client helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("adds the bearer token header and returns parsed JSON payloads", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: [{ skuId: "sku-1" }] }));

    const result = await graphRequest<{ value: Array<{ skuId: string }> }>(
      "graph-token",
      "/subscribedSkus",
      fetchMock,
    );

    expect(result.value[0].skuId).toBe("sku-1");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer graph-token");
  });

  it("surfaces Graph API errors", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { message: "Graph said no" } }, { status: 403, statusText: "Forbidden" }),
    );

    await expect(graphRequest("graph-token", "/subscribedSkus", fetchMock)).rejects.toThrow(
      "Graph said no",
    );
  });

  it("rejects an empty successful response body", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));

    await expect(graphRequest("graph-token", "/subscribedSkus", fetchMock)).rejects.toThrow(
      "Graph request returned an empty response",
    );
  });

  it("rejects malformed JSON in a successful response", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    await expect(graphRequest("graph-token", "/subscribedSkus", fetchMock)).rejects.toThrow(
      "Graph request returned malformed JSON",
    );
  });

  it("requests subscribed SKUs with the expected select list", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: [{ skuId: "sku-1" }] }));

    const result = await listGraphSubscribedSkus("graph-token", fetchMock);

    expect(result).toEqual([{ skuId: "sku-1" }]);
    const [url] = fetchMock.mock.calls[0] as [string];
    const searchParams = new URL(url).searchParams;
    expect(searchParams.get("$select")).toBe(
      "skuId,skuPartNumber,consumedUnits,prepaidUnits,capabilityStatus,appliesTo,servicePlans",
    );
  });

  it("rejects subscribedSkus responses without a value array", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: null }));

    await expect(listGraphSubscribedSkus("graph-token", fetchMock)).rejects.toThrow(
      "Graph subscribedSkus response was malformed",
    );
  });
});

describe("syncGraphSubscriptions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("upserts the latest snapshot and removes stale subscription and service plan rows", async () => {
    const supabase = createSupabaseClientDouble({
      existingSubscriptions: [{ sku_id: "sku-1" }, { sku_id: "sku-legacy" }],
      existingServicePlans: [
        { sku_id: "sku-1", service_plan_id: "plan-keep" },
        { sku_id: "sku-1", service_plan_id: "plan-remove" },
        { sku_id: "sku-legacy", service_plan_id: "plan-legacy" },
      ],
    });
    createServerSupabaseClient.mockReturnValue(supabase.client);

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("/oauth2/v2.0/token")) {
        return jsonResponse({ access_token: "graph-token" });
      }

      if (url.includes("/subscribedSkus?")) {
        return jsonResponse({
          value: [
            {
              skuId: "sku-1",
              skuPartNumber: "M365_E3",
              capabilityStatus: "Enabled",
              appliesTo: "User",
              consumedUnits: 4,
              prepaidUnits: { enabled: 10, warning: 1 },
              servicePlans: [{ servicePlanId: "plan-keep", servicePlanName: "KEEP_PLAN" }],
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { syncGraphSubscriptions } =
      await vi.importActual<typeof import("@/lib/sync/subscriptions")>("@/lib/sync/subscriptions");
    const result = await syncGraphSubscriptions(fetchMock);

    expect(result.subscriptions).toHaveLength(1);
    expect(supabase.graphSubscriptionsTable.select).toHaveBeenCalledWith("sku_id");
    expect(supabase.graphServicePlansTable.select).toHaveBeenCalledWith("sku_id,service_plan_id");
    expect(supabase.subscriptionDeleteCalls).toEqual([["sku-legacy"]]);
    expect(supabase.servicePlanDeleteCalls).toEqual([
      { skuId: "sku-1", servicePlanIds: ["plan-remove"] },
      { skuId: "sku-legacy", servicePlanIds: ["plan-legacy"] },
    ]);
    expect(supabase.graphSyncJobsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        stats_payload: {
          syncedSubscriptions: 1,
          syncedServicePlans: 1,
        },
      }),
    );
  });

  it("records a failed sync job when Graph sync fails", async () => {
    const supabase = createSupabaseClientDouble();
    createServerSupabaseClient.mockReturnValue(supabase.client);
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: "invalid_client", error_description: "Token fetch failed" }, { status: 401 }),
    );

    const { syncGraphSubscriptions } =
      await vi.importActual<typeof import("@/lib/sync/subscriptions")>("@/lib/sync/subscriptions");

    await expect(syncGraphSubscriptions(fetchMock)).rejects.toThrow("Token fetch failed");
    expect(supabase.graphSyncJobsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "Token fetch failed",
        stats_payload: {},
      }),
    );
  });
});

describe("GET /api/admin/subscriptions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when the admin session is missing", async () => {
    readSessionFromRequest.mockResolvedValue(null);

    const { GET } = await import("@/app/api/admin/subscriptions/route");
    const response = await GET(new Request("http://localhost/api/admin/subscriptions"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns the subscription catalog for authorized admins", async () => {
    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    listSubscriptionCatalog.mockResolvedValue([{ sku_id: "sku-1", service_plans: [] }]);

    const { GET } = await import("@/app/api/admin/subscriptions/route");
    const response = await GET(new Request("http://localhost/api/admin/subscriptions"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      subscriptions: [{ sku_id: "sku-1", service_plans: [] }],
    });
    expect(listSubscriptionCatalog).toHaveBeenCalledWith({ tag: "supabase-client" });
  });

  it("returns 500 when loading the catalog fails", async () => {
    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    createServerSupabaseClient.mockReturnValue({ tag: "supabase-client" });
    listSubscriptionCatalog.mockRejectedValue(new Error("catalog unavailable"));

    const { GET } = await import("@/app/api/admin/subscriptions/route");
    const response = await GET(new Request("http://localhost/api/admin/subscriptions"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "catalog unavailable" });
  });
});

describe("POST /api/admin/subscriptions/refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when the admin session is missing", async () => {
    readSessionFromRequest.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/subscriptions/refresh/route");
    const response = await POST(new Request("http://localhost/api/admin/subscriptions/refresh"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns refresh counts for authorized admins", async () => {
    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    syncGraphSubscriptionsMock.mockResolvedValue({
      subscriptions: [{ sku_id: "sku-1" }],
      servicePlans: [{ sku_id: "sku-1", service_plan_id: "plan-1" }],
    });

    const { POST } = await import("@/app/api/admin/subscriptions/refresh/route");
    const response = await POST(new Request("http://localhost/api/admin/subscriptions/refresh"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      syncedSubscriptions: 1,
      syncedServicePlans: 1,
    });
  });

  it("returns 500 when the refresh fails", async () => {
    readSessionFromRequest.mockResolvedValue({ adminId: "admin-1", username: "owner" });
    syncGraphSubscriptionsMock.mockRejectedValue(new Error("refresh failed"));

    const { POST } = await import("@/app/api/admin/subscriptions/refresh/route");
    const response = await POST(new Request("http://localhost/api/admin/subscriptions/refresh"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "refresh failed" });
  });
});
