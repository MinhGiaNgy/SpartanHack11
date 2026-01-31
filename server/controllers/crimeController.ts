import { getCrimes } from "@/server/services/crimeService";
import { toCrimesDto } from "@/server/mappers/crimeMapper";
import type { QueryFilters } from "@/server/repository/crimeRepository";

export async function handleGetCrimes(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse and validate query parameters
    const since = url.searchParams.get("since") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "250"), 1000);
    const source = url.searchParams.get("source") ?? undefined;

    const filters: QueryFilters = {
      since,
      limit,
      source,
    };

    // Call service layer
    const incidents = await getCrimes(filters);

    // Map to DTOs
    const dtos = toCrimesDto(incidents);

    // Return JSON response
    return Response.json({ data: dtos });
  } catch (error) {
    console.error("Error fetching crimes:", error);
    return Response.json(
      { error: "Failed to fetch crime incidents" },
      { status: 500 }
    );
  }
}
