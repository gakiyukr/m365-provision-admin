import { listGraphSubscribedSkus } from "@/lib/graph/client";
import { normalizeSubscribedSkus } from "@/lib/graph/subscriptions";
import { getGraphToken } from "@/lib/graph/token";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function recordGraphSyncJob(
  client: ReturnType<typeof createServerSupabaseClient>,
  payload: {
    status: string;
    started_at: string;
    finished_at: string;
    error_message?: string | null;
    stats_payload: Record<string, number>;
  },
) {
  await client.from("graph_sync_jobs").insert(payload);
}

async function pruneStaleSubscriptions(
  client: ReturnType<typeof createServerSupabaseClient>,
  skuIds: string[],
) {
  const { data, error } = await client.from("graph_subscriptions").select("sku_id");

  if (error) {
    throw error;
  }

  const staleSkuIds = (data ?? [])
    .map((row) => row.sku_id)
    .filter((skuId) => !skuIds.includes(skuId));

  if (staleSkuIds.length === 0) {
    return;
  }

  const { error: deleteError } = await client.from("graph_subscriptions").delete().in("sku_id", staleSkuIds);

  if (deleteError) {
    throw deleteError;
  }
}

async function pruneStaleServicePlans(
  client: ReturnType<typeof createServerSupabaseClient>,
  servicePlans: Array<{ sku_id: string; service_plan_id: string }>,
) {
  const { data, error } = await client.from("graph_service_plans").select("sku_id,service_plan_id");

  if (error) {
    throw error;
  }

  const latestPlanIdsBySku = new Map<string, Set<string>>();
  for (const servicePlan of servicePlans) {
    const planIds = latestPlanIdsBySku.get(servicePlan.sku_id) ?? new Set<string>();
    planIds.add(servicePlan.service_plan_id);
    latestPlanIdsBySku.set(servicePlan.sku_id, planIds);
  }

  const stalePlanIdsBySku = new Map<string, string[]>();
  for (const existingPlan of data ?? []) {
    const latestPlanIds = latestPlanIdsBySku.get(existingPlan.sku_id);

    if (latestPlanIds?.has(existingPlan.service_plan_id)) {
      continue;
    }

    const stalePlanIds = stalePlanIdsBySku.get(existingPlan.sku_id) ?? [];
    stalePlanIds.push(existingPlan.service_plan_id);
    stalePlanIdsBySku.set(existingPlan.sku_id, stalePlanIds);
  }

  for (const [skuId, stalePlanIds] of stalePlanIdsBySku) {
    const { error: deleteError } = await client
      .from("graph_service_plans")
      .delete()
      .eq("sku_id", skuId)
      .in("service_plan_id", stalePlanIds);

    if (deleteError) {
      throw deleteError;
    }
  }
}

export async function syncGraphSubscriptions(fetchImpl: typeof fetch = fetch) {
  const startedAt = new Date().toISOString();
  const client = createServerSupabaseClient();

  try {
    const token = await getGraphToken(fetchImpl);
    const normalized = normalizeSubscribedSkus(await listGraphSubscribedSkus(token, fetchImpl));

    if (normalized.subscriptions.length > 0) {
      const { error } = await client.from("graph_subscriptions").upsert(normalized.subscriptions, {
        onConflict: "sku_id",
      });

      if (error) {
        throw error;
      }
    }

    if (normalized.servicePlans.length > 0) {
      const { error } = await client.from("graph_service_plans").upsert(normalized.servicePlans, {
        onConflict: "sku_id,service_plan_id",
      });

      if (error) {
        throw error;
      }
    }

    await pruneStaleSubscriptions(
      client,
      normalized.subscriptions.map((subscription) => subscription.sku_id),
    );
    await pruneStaleServicePlans(
      client,
      normalized.servicePlans.map((servicePlan) => ({
        sku_id: servicePlan.sku_id,
        service_plan_id: servicePlan.service_plan_id,
      })),
    );

    await recordGraphSyncJob(client, {
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      stats_payload: {
        syncedSubscriptions: normalized.subscriptions.length,
        syncedServicePlans: normalized.servicePlans.length,
      },
    });

    return normalized;
  } catch (error) {
    await recordGraphSyncJob(client, {
      status: "failed",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
      stats_payload: {},
    });

    throw error;
  }
}
