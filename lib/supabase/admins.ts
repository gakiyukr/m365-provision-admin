import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableRow } from "@/types/database";

type Client = Pick<SupabaseClient<Database>, "from">;
type AdminRow = TableRow<"admins">;

export async function findAdminByUsername(client: Client, username: string): Promise<AdminRow | null> {
  const { data, error } = await client
    .from("admins")
    .select("*")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function touchAdminLastLogin(client: Client, adminId: string): Promise<void> {
  const { error } = await client
    .from("admins")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", adminId);

  if (error) {
    throw error;
  }
}
