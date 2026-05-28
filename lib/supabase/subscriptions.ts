import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableRow } from "@/types/database";

type Client = Pick<SupabaseClient<Database>, "from">;
type GraphSubscriptionRow = TableRow<"graph_subscriptions">;
type GraphServicePlanRow = TableRow<"graph_service_plans">;
type SubscriptionPolicyRow = TableRow<"subscription_policies">;
type ServicePlanPolicyRow = TableRow<"service_plan_policies">;

type SubscriptionCatalogItem = GraphSubscriptionRow & {
  service_plans: GraphServicePlanRow[];
  policy: SubscriptionPolicyRow | null;
  service_plan_policies: ServicePlanPolicyRow[];
};

export type AssignableSkuCatalogItem = {
  skuId: string;
  skuPartNumber: string;
  availableUnits: number;
  priority: number;
  servicePlans: string[];
  servicePlanIds: string[];
  forcedKeepServicePlanIds: string[];
  forbiddenServicePlanIds: string[];
};

export async function listSubscriptionCatalog(client: Client): Promise<SubscriptionCatalogItem[]> {
  const [subscriptionsResult, servicePlansResult, policiesResult, servicePlanPoliciesResult] = await Promise.all([
    client
      .from("graph_subscriptions")
      .select("*")
      .order("sku_part_number", { ascending: true }),
    client
      .from("graph_service_plans")
      .select("*")
      .order("service_plan_name", { ascending: true }),
    client.from("subscription_policies").select("*"),
    client.from("service_plan_policies").select("*"),
  ]);

  if (subscriptionsResult.error) {
    throw subscriptionsResult.error;
  }

  if (servicePlansResult.error) {
    throw servicePlansResult.error;
  }

  if (policiesResult.error) {
    throw policiesResult.error;
  }

  if (servicePlanPoliciesResult.error) {
    throw servicePlanPoliciesResult.error;
  }

  const servicePlansBySku = new Map<string, GraphServicePlanRow[]>();
  for (const servicePlan of servicePlansResult.data ?? []) {
    const current = servicePlansBySku.get(servicePlan.sku_id) ?? [];
    current.push(servicePlan);
    servicePlansBySku.set(servicePlan.sku_id, current);
  }

  const policyBySku = new Map<string, SubscriptionPolicyRow>();
  for (const policy of policiesResult.data ?? []) {
    policyBySku.set(policy.sku_id, policy);
  }

  const servicePlanPoliciesBySku = new Map<string, ServicePlanPolicyRow[]>();
  for (const policy of servicePlanPoliciesResult.data ?? []) {
    const current = servicePlanPoliciesBySku.get(policy.sku_id) ?? [];
    current.push(policy);
    servicePlanPoliciesBySku.set(policy.sku_id, current);
  }

  return (subscriptionsResult.data ?? []).map((subscription) => ({
    ...subscription,
    service_plans: servicePlansBySku.get(subscription.sku_id) ?? [],
    policy: policyBySku.get(subscription.sku_id) ?? null,
    service_plan_policies: servicePlanPoliciesBySku.get(subscription.sku_id) ?? [],
  }));
}

export async function listAssignableSkuCatalog(client: Client): Promise<AssignableSkuCatalogItem[]> {
  const catalog = await listSubscriptionCatalog(client);

  return catalog
    .filter((subscription) => {
      const policy = subscription.policy;
      return policy?.is_assignable === true && subscription.available_units > 0;
    })
    .map((subscription) => {
      const forcedKeepServicePlanIds = subscription.service_plan_policies
        .filter((policy) => policy.is_forced_keep && !policy.is_forbidden)
        .map((policy) => policy.service_plan_id);
      const forbiddenServicePlanIds = subscription.service_plan_policies
        .filter((policy) => policy.is_forbidden && !policy.is_forced_keep)
        .map((policy) => policy.service_plan_id);

      return {
        skuId: subscription.sku_id,
        skuPartNumber: subscription.sku_part_number,
        availableUnits: subscription.available_units,
        priority: subscription.policy?.priority ?? 0,
        servicePlans: subscription.service_plans.map((servicePlan) => servicePlan.service_plan_name),
        servicePlanIds: subscription.service_plans.map((servicePlan) => servicePlan.service_plan_id),
        forcedKeepServicePlanIds,
        forbiddenServicePlanIds,
      };
    })
    .sort((left, right) => left.skuPartNumber.localeCompare(right.skuPartNumber));
}
