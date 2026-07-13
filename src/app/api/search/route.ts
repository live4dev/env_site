import { NextResponse } from "next/server";
import { searchNotes } from "@/lib/search";
import { requireUser } from "@/lib/auth/session";
import { canAccessRaw } from "@/lib/notes/access";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 20);
  const results = await searchNotes({
    q: url.searchParams.get("q") ?? undefined,
    mode: (url.searchParams.get("mode") as "keyword" | "semantic" | "hybrid") ?? "hybrid",
    status: url.searchParams.get("status") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    sources: url.searchParams.get("sources") ?? undefined,
    limit: Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 50)) : 20,
    rawAllowed: canAccessRaw(user),
  });
  return NextResponse.json({ results });
}
