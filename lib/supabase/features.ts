import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableRow } from "@/types/database";

type Client = Pick<SupabaseClient<Database>, "from">;
type FeatureRow = TableRow<"feature_definitions">;
type FeatureRuleRow = TableRow<"feature_match_rules">;
type FeatureRuleMatchType = FeatureRuleRow["match_type"];

export type VisibleFeature = Pick<
  FeatureRow,
  "id" | "key" | "name" | "description" | "is_default_selected" | "sort_order"
>;

export type FeatureRule = Pick<FeatureRuleRow, "id" | "feature_id" | "match_type" | "match_value"> & {
  feature_key: FeatureRow["key"];
  feature_name: FeatureRow["name"];
};

type FeatureRuleQueryRow = {
  id: FeatureRuleRow["id"];
  feature_id: FeatureRuleRow["feature_id"];
  match_type: FeatureRuleMatchType;
  match_value: FeatureRuleRow["match_value"];
  feature_definitions: Pick<FeatureRow, "key" | "name"> | Array<Pick<FeatureRow, "key" | "name">> | null;
};

export async function listVisibleFeatures(client: Client): Promise<VisibleFeature[]> {
  const { data, error } = await client
    .from("feature_definitions")
    .select("id, key, name, description, is_default_selected, sort_order")
    .eq("is_enabled", true)
    .eq("is_frontend_visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return [...(data ?? [])].sort((left, right) => left.sort_order - right.sort_order);
}

export async function listFeatureRulesByIds(client: Client, featureIds: string[]): Promise<FeatureRule[]> {
  if (featureIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("feature_match_rules")
    .select("id, feature_id, match_type, match_value, feature_definitions!inner(key, name)")
    .in("feature_id", featureIds)
    .eq("feature_definitions.is_enabled", true)
    .order("match_value", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as FeatureRuleQueryRow[]).map((row) => {
    const definition = Array.isArray(row.feature_definitions)
      ? row.feature_definitions[0]
      : row.feature_definitions;

    return {
      id: row.id,
      feature_id: row.feature_id,
      match_type: row.match_type,
      match_value: row.match_value,
      feature_key: definition?.key ?? "",
      feature_name: definition?.name ?? "",
    };
  });
}
