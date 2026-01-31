import { getCrimes } from "@/server/services/crimeService";
import { toDtos } from "@/server/mappers/crimeMapper";
import { GetCrimesSchema, type GetCrimesRequest } from "@/server/types/crime";

export async function handleGetCrimes(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse and validate query parameters
    const params = {
      since: url.searchParams.get("since") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? "250"),
      source: url.searchParams.get("source") ?? undefined,
    };

    // Validate using Zod
    const filters: GetCrimesRequest = GetCrimesSchema.parse(params);

    // Call service layer
    const incidents = await getCrimes(filters);

    // Map to DTOs
    const dtos = toDtos(incidents);

    // Return JSON response
    return Response.json({ data: dtos });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return Response.json(
        { error: "Invalid query parameters", details: (error as any).errors },
        { status: 400 }
      );
    }
    console.error("Error fetching crimes:", error);
    return Response.json(
      { error: "Failed to fetch crime incidents" },
      { status: 500 }
    );
  }
}
