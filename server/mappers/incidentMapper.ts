import type { CrimeIncident } from "@prisma/client";
import type { IncidentDto } from "@/server/types/incident";

function determineType(text: string): "robbery" | "assault" | "harassment" | "other" {
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
  return "other";
}

export function toDto(incident: CrimeIncident & { latitude?: number | null; longitude?: number | null }): IncidentDto {
  return {
    id: incident.id,
    name: incident.offenseCode || `Incident ${incident.incidentNum}` || "Reported Incident",
    type: determineType(incident.description),
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
