import type { FeatureRule } from "@/lib/supabase/features";
import type { AssignableSkuCatalogItem } from "@/lib/supabase/subscriptions";

type CandidatePlan = {
  servicePlanId: string;
  servicePlanName: string;
};

export type ResolvedFeatureSelection = {
  featureId: string;
  featureKey: string;
  featureName: string;
  planNames: string[];
  planIds: string[];
};

export type ResolvedTargetPlans = {
  planNames: Set<string>;
  planIds: Set<string>;
  features: ResolvedFeatureSelection[];
};

type CandidateCoverage = {
  matchedIndexes: Set<number>;
  enabledExtraPlanCount: number;
};

function uniquePreservingOrder(values: string[]) {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function toCandidatePlans(candidate: AssignableSkuCatalogItem): CandidatePlan[] {
  return candidate.servicePlanIds.map((servicePlanId, index) => ({
    servicePlanId,
    servicePlanName: candidate.servicePlans[index] ?? servicePlanId,
  }));
}

function getCandidateCoverage(
  candidate: AssignableSkuCatalogItem,
  targetPlanNames: Set<string>,
  targetPlanIds: Set<string>,
): CandidateCoverage | null {
  const candidatePlans = toCandidatePlans(candidate);
  const matchedIndexes = new Set<number>();

  for (const targetPlanName of targetPlanNames) {
    const index = candidatePlans.findIndex((plan) => plan.servicePlanName === targetPlanName);
    if (index === -1) {
      return null;
    }

    if (candidate.forbiddenServicePlanIds.includes(candidatePlans[index].servicePlanId)) {
      return null;
    }

    matchedIndexes.add(index);
  }

  for (const targetPlanId of targetPlanIds) {
    const index = candidatePlans.findIndex((plan) => plan.servicePlanId === targetPlanId);
    if (index === -1) {
      return null;
    }

    if (candidate.forbiddenServicePlanIds.includes(targetPlanId)) {
      return null;
    }

    matchedIndexes.add(index);
  }

  const forcedKeepPlanIds = new Set(candidate.forcedKeepServicePlanIds);
  const enabledExtraPlanCount = candidatePlans.filter((plan, index) => {
    if (matchedIndexes.has(index)) {
      return false;
    }

    return forcedKeepPlanIds.has(plan.servicePlanId);
  }).length;

  return {
    matchedIndexes,
    enabledExtraPlanCount,
  };
}

export function resolveFeatureSelection(rules: FeatureRule[]): ResolvedTargetPlans {
  const planNames = new Set<string>();
  const planIds = new Set<string>();
  const featureMap = new Map<string, ResolvedFeatureSelection>();

  for (const rule of rules) {
    const current = featureMap.get(rule.feature_id) ?? {
      featureId: rule.feature_id,
      featureKey: rule.feature_key,
      featureName: rule.feature_name,
      planNames: [],
      planIds: [],
    };

    if (rule.match_type === "servicePlanName") {
      current.planNames = uniquePreservingOrder([...current.planNames, rule.match_value]);
      planNames.add(rule.match_value);
    } else {
      current.planIds = uniquePreservingOrder([...current.planIds, rule.match_value]);
      planIds.add(rule.match_value);
    }

    featureMap.set(rule.feature_id, current);
  }

  return {
    planNames,
    planIds,
    features: [...featureMap.values()],
  };
}

export function pickBestSku(
  candidates: AssignableSkuCatalogItem[],
  targetPlanNames: Set<string>,
  targetPlanIds: Set<string> = new Set<string>(),
) {
  if (targetPlanNames.size === 0 && targetPlanIds.size === 0) {
    return null;
  }

  return [...candidates]
    .map((candidate) => ({
      candidate,
      coverage: getCandidateCoverage(candidate, targetPlanNames, targetPlanIds),
    }))
    .filter(
      (
        item,
      ): item is {
        candidate: AssignableSkuCatalogItem;
        coverage: CandidateCoverage;
      } => item.coverage !== null,
    )
    .sort((left, right) => {
      if (left.coverage.enabledExtraPlanCount !== right.coverage.enabledExtraPlanCount) {
        return left.coverage.enabledExtraPlanCount - right.coverage.enabledExtraPlanCount;
      }

      if (left.candidate.priority !== right.candidate.priority) {
        return right.candidate.priority - left.candidate.priority;
      }

      if (left.candidate.availableUnits !== right.candidate.availableUnits) {
        return right.candidate.availableUnits - left.candidate.availableUnits;
      }

      return left.candidate.skuPartNumber.localeCompare(right.candidate.skuPartNumber);
    })[0]?.candidate ?? null;
}

export function buildDisabledPlans(args: {
  skuServicePlans: CandidatePlan[];
  selectedPlanNames: Set<string>;
  selectedPlanIds: Set<string>;
  forcedKeepPlanIds: Set<string>;
}) {
  const keptPlans = args.skuServicePlans
    .filter(
      (plan) =>
        args.selectedPlanNames.has(plan.servicePlanName) ||
        args.selectedPlanIds.has(plan.servicePlanId) ||
        args.forcedKeepPlanIds.has(plan.servicePlanId),
    )
    .map((plan) => plan.servicePlanId);

  const disabledPlans = args.skuServicePlans
    .filter((plan) => !keptPlans.includes(plan.servicePlanId))
    .map((plan) => plan.servicePlanId);

  const enabledApplications = uniquePreservingOrder(
    args.skuServicePlans
      .filter((plan) => keptPlans.includes(plan.servicePlanId))
      .map((plan) => plan.servicePlanName),
  );

  return {
    keptPlans,
    disabledPlans,
    enabledApplications,
  };
}

export function findUnavailableFeatures(
  features: ResolvedFeatureSelection[],
  candidates: AssignableSkuCatalogItem[],
) {
  return features
    .filter((feature) => pickBestSku(candidates, new Set(feature.planNames), new Set(feature.planIds)) === null)
    .map((feature) => ({
      featureId: feature.featureId,
      featureKey: feature.featureKey,
      featureName: feature.featureName,
    }));
}

export function getPreviewFailureReason(args: {
  selectedSku: AssignableSkuCatalogItem | null;
  unavailableFeatures: Array<{ featureId: string; featureKey: string; featureName: string }>;
  hasRequestedFeatures: boolean;
}) {
  if (args.selectedSku !== null) {
    return null;
  }

  if (args.unavailableFeatures.length > 0) {
    return "unavailable_features";
  }

  if (args.hasRequestedFeatures) {
    return "no_single_sku_covers_selection";
  }

  return null;
}
