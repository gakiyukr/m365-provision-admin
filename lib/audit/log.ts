import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableInsert } from "@/types/database";

type Client = Pick<SupabaseClient<Database>, "from">;
type AuditLogInsert = TableInsert<"audit_logs">;

export async function createAuditLog(client: Client, entry: AuditLogInsert): Promise<void> {
  const { error } = await client.from("audit_logs").insert(entry);

  if (error) {
    throw error;
  }
}
