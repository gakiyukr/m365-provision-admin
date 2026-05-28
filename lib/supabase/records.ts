import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableInsert, TableRow } from "@/types/database";

type Client = Pick<SupabaseClient<Database>, "from">;
type ProvisionRecordInsert = TableInsert<"provision_records">;
type ProvisionRecordRow = TableRow<"provision_records">;

export async function createProvisionRecord(client: Client, record: ProvisionRecordInsert): Promise<void> {
  const { error } = await client.from("provision_records").insert(record);

  if (error) {
    throw error;
  }
}

export async function listProvisionRecords(client: Client): Promise<ProvisionRecordRow[]> {
  const { data, error } = await client
    .from("provision_records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
