import type { CrimeIncident } from "@prisma/client";
import type { IncidentDto } from "@/server/types/incident";

function determineType(text: string): "robbery" | "assault" | "harassment" | "traffic" | "other" {
  const lower = text.toLowerCase();
  if (
    lower.includes("robbery") ||
    lower.includes("theft") ||
    lower.includes("stolen") ||
    lower.includes("larceny")
  )
    return "robbery";
  if (
    lower.includes("assault") ||
    lower.includes("battery") ||
    lower.includes("fight")
  )
    return "assault";
  if (
    lower.includes("harassment") ||
    lower.includes("stalking") ||
    lower.includes("threat")
  )
    return "harassment";
  if (
    lower.includes("traffic") ||
    lower.includes("accident") ||
    lower.includes("collision") ||
    lower.includes("crash")
  )
    return "traffic";
  return "other";
}

export function toDto(incident: CrimeIncident & { latitude?: number | null; longitude?: number | null }): IncidentDto {
  let type: IncidentDto["type"] = determineType(incident.description);

  // Use explicit type from user submission if available
  if (incident.raw && typeof incident.raw === "object" && !Array.isArray(incident.raw)) {
    const rawData = incident.raw as any;
    if (rawData.type && ["robbery", "assault", "harassment", "traffic", "other"].includes(rawData.type)) {
      type = rawData.type;
    }
  }

  return {
    id: incident.id,
    name: incident.offenseCode || `Incident ${incident.incidentNum}` || "Reported Incident",
    type,
    details: incident.description,
    location: {
      lat: incident.latitude || 0,
      lng: incident.longitude || 0,
    },
    timestamp: incident.occurredAt?.toISOString() || incident.createdAt.toISOString(),
  };
}

export function toDtos(incidents: (CrimeIncident & { latitude?: number | null; longitude?: number | null })[]): IncidentDto[] {
  return incidents.map(toDto);
}
