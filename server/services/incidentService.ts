import { getIncidents, createIncident } from "@/server/repository/incidentRepository";
import type { CreateIncidentRequest } from "@/server/types/incident";

export async function getIncidentsService(limit: number) {
  return getIncidents(limit);
}

export async function createIncidentService(data: CreateIncidentRequest) {
  return createIncident(data);
}
