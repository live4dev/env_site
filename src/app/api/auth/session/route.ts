import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  return NextResponse.json({ user: await getSessionUser() });
}
