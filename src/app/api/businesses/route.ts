import type { NextRequest } from "next/server";
import { demoProvider } from "@/lib/providers/demo";
import { googlePlacesProvider } from "@/lib/providers/google-places";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const results = await demoProvider.search(query);
  return Response.json({
    results,
    // Live search is reported but not used until the integration is built.
    liveSearchAvailable: googlePlacesProvider.isAvailable(),
  });
}
