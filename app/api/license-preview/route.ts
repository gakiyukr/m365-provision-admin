import { NextResponse } from "next/server";
import {
  buildDisabledPlans,
  findUnavailableFeatures,
  getPreviewFailureReason,
  pickBestSku,
  resolveFeatureSelection,
} from "@/lib/licensing/engine";
import { listFeatureRulesByIds } from "@/lib/supabase/features";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listAssignableSkuCatalog } from "@/lib/supabase/subscriptions";

type PreviewRequestBody = {
  featureIds?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreviewRequestBody;
    const featureIds = Array.isArray(body.featureIds)
      ? body.featureIds.filter((featureId): featureId is string => typeof featureId === "string" && featureId.length > 0)
      : [];

    const client = createServerSupabaseClient();
    const [rules, catalog] = await Promise.all([
      listFeatureRulesByIds(client, featureIds),
      listAssignableSkuCatalog(client),
    ]);

    const resolved = resolveFeatureSelection(rules);
    const selectedSku = pickBestSku(catalog, resolved.planNames, resolved.planIds);
    const unavailableFeatures = selectedSku === null ? findUnavailableFeatures(resolved.features, catalog) : [];
    const failureReason = getPreviewFailureReason({
      selectedSku,
      unavailableFeatures,
      hasRequestedFeatures: featureIds.length > 0,
    });
    const previewPlans =
      selectedSku === null
        ? { keptPlans: [], disabledPlans: [], enabledApplications: [] }
        : buildDisabledPlans({
            skuServicePlans: selectedSku.servicePlanIds.map((servicePlanId, index) => ({
              servicePlanId,
              servicePlanName: selectedSku.servicePlans[index] ?? servicePlanId,
            })),
            selectedPlanNames: resolved.planNames,
            selectedPlanIds: resolved.planIds,
            forcedKeepPlanIds: new Set(selectedSku.forcedKeepServicePlanIds),
          });

    return NextResponse.json({
      ok: selectedSku !== null,
      selectedSku:
        selectedSku === null
          ? null
          : {
              skuId: selectedSku.skuId,
              skuPartNumber: selectedSku.skuPartNumber,
            },
      enabledApplications: previewPlans.enabledApplications,
      disabledServicePlanIds: previewPlans.disabledPlans,
      unavailableFeatures,
      failureReason,
      targetPlans: {
        names: [...resolved.planNames].sort((left, right) => left.localeCompare(right)),
        ids: [...resolved.planIds].sort((left, right) => left.localeCompare(right)),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "無法預覽授權選擇" },
      { status: 500 },
    );
  }
}
