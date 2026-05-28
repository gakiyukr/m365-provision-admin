import { NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: Request) {
  const admin = await readSessionFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ admin });
}
