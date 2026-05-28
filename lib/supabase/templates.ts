import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableRow } from "@/types/database";

type Client = Pick<SupabaseClient<Database>, "from">;
type TemplateRow = TableRow<"license_templates">;
type TemplateFeatureRow = TableRow<"license_template_features">;

export type EnabledTemplate = Pick<TemplateRow, "id" | "key" | "name" | "description" | "sort_order">;
export type EnabledTemplateWithFeatureIds = EnabledTemplate & {
  featureIds: string[];
};

export async function listEnabledTemplates(client: Client): Promise<EnabledTemplate[]> {
  const { data, error } = await client
    .from("license_templates")
    .select("id, key, name, description, sort_order")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return [...(data ?? [])].sort((left, right) => left.sort_order - right.sort_order);
}

export async function listTemplateFeatureLinks(
  client: Client,
  templateIds: string[],
): Promise<Array<Pick<TemplateFeatureRow, "template_id" | "feature_id">>> {
  if (templateIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("license_template_features")
    .select("template_id, feature_id, feature_definitions!inner(id)")
    .in("template_id", templateIds)
    .eq("feature_definitions.is_enabled", true);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listEnabledTemplatesWithFeatureIds(client: Client): Promise<EnabledTemplateWithFeatureIds[]> {
  const templates = await listEnabledTemplates(client);
  const links = await listTemplateFeatureLinks(
    client,
    templates.map((template) => template.id),
  );

  const featureIdsByTemplateId = new Map<string, string[]>();
  for (const link of links) {
    const current = featureIdsByTemplateId.get(link.template_id) ?? [];
    current.push(link.feature_id);
    featureIdsByTemplateId.set(link.template_id, current);
  }

  return templates.map((template) => ({
    ...template,
    featureIds: featureIdsByTemplateId.get(template.id) ?? [],
  }));
}
