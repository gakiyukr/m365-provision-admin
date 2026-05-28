import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { syncGraphSubscriptions } from "@/lib/sync/subscriptions";

export async function POST(request: Request) {
  const admin = await readSessionFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGraphSubscriptions();

    return NextResponse.json({
      ok: true,
      syncedSubscriptions: result.subscriptions.length,
      syncedServicePlans: result.servicePlans.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh subscriptions" },
      { status: 500 },
    );
  }
}
