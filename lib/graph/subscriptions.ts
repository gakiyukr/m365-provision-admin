import type { GraphSubscribedSku } from "@/lib/graph/client";
import type { Json, TableInsert } from "@/types/database";

export type NormalizedSubscribedSkus = {
  subscriptions: TableInsert<"graph_subscriptions">[];
  servicePlans: TableInsert<"graph_service_plans">[];
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return Number(value || 0);
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return String(value);
}

function toNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
}

function toJsonValue(value: unknown): Json {
  if (value == null) {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Json;
}

export function normalizeSubscribedSkus(items: GraphSubscribedSku[]): NormalizedSubscribedSkus {
  const subscriptions = items
    .filter((item) => typeof item.skuId === "string" && item.skuId.length > 0)
    .map<TableInsert<"graph_subscriptions">>((item) => {
      const enabledUnits = toNumber(item.prepaidUnits?.enabled);
      const warningUnits = toNumber(item.prepaidUnits?.warning);
      const consumedUnits = toNumber(item.consumedUnits);

      return {
        sku_id: item.skuId as string,
        sku_part_number: toStringValue(item.skuPartNumber),
        capability_status: toStringValue(item.capabilityStatus),
        applies_to: toStringValue(item.appliesTo),
        enabled_units: enabledUnits,
        warning_units: warningUnits,
        consumed_units: consumedUnits,
        available_units: enabledUnits + warningUnits - consumedUnits,
        raw_payload: toJsonValue(item),
      };
    });

  const servicePlans = items.flatMap<TableInsert<"graph_service_plans">>((item) => {
    if (typeof item.skuId !== "string" || item.skuId.length === 0) {
      return [];
    }

    return (item.servicePlans ?? [])
      .filter((plan) => typeof plan.servicePlanId === "string" && plan.servicePlanId.length > 0)
      .map((plan) => ({
        sku_id: item.skuId as string,
        service_plan_id: plan.servicePlanId as string,
        service_plan_name: toStringValue(plan.servicePlanName),
        provisioning_status: toNullableString(plan.provisioningStatus),
        applies_to: toNullableString(plan.appliesTo),
        raw_payload: toJsonValue(plan),
      }));
  });

  return {
    subscriptions,
    servicePlans,
  };
}
