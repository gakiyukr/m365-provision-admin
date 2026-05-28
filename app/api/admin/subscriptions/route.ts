import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSubscriptionCatalog } from "@/lib/supabase/subscriptions";

export async function GET(request: Request) {
  const admin = await readSessionFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createServerSupabaseClient();
    const subscriptions = await listSubscriptionCatalog(client);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load subscriptions" },
      { status: 500 },
    );
  }
}
