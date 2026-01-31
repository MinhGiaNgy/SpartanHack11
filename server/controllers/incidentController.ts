import { getIncidentsService, createIncidentService } from "@/server/services/incidentService";
import { toDtos, toDto } from "@/server/mappers/incidentMapper";
import { GetIncidentsSchema, CreateIncidentSchema, type GetIncidentsRequest, type CreateIncidentRequest } from "@/server/types/incident";

export async function handleGetIncidents(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse and validate query parameters
    const params = {
      limit: Number(url.searchParams.get("limit") ?? "100"),
    };

    // Validate using Zod
    const filters: GetIncidentsRequest = GetIncidentsSchema.parse(params);

    // Call service layer
    const incidents = await getIncidentsService(filters.limit);

    // Map to DTOs
    const dtos = toDtos(incidents);

    // Return JSON response
    return Response.json(dtos);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return Response.json(
        { error: "Invalid query parameters", details: (error as any).errors },
        { status: 400 }
      );
    }
    console.error("Error fetching incidents:", error);
    return Response.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function handleCreateIncident(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Validate using Zod
    const data: CreateIncidentRequest = CreateIncidentSchema.parse(body);

    // Call service layer
    const incident = await createIncidentService(data);

    // Map to DTO
    const dto = toDto(incident);

    // Return JSON response
    return Response.json(dto);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return Response.json(
        { error: "Invalid request body", details: (error as any).errors },
        { status: 400 }
      );
    }
    console.error("Error creating incident:", error);
    return Response.json(
      { error: "Failed to create incident" },
      { status: 500 }
    );
  }
}
