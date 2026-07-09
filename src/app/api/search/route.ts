import { NextResponse } from "next/server";
import { searchNotes } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const results = await searchNotes({
    q: url.searchParams.get("q") ?? undefined,
    mode: (url.searchParams.get("mode") as "keyword" | "semantic" | "hybrid") ?? "hybrid",
    status: url.searchParams.get("status") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    sources: url.searchParams.get("sources") ?? undefined,
  });
  return NextResponse.json({ results });
}
