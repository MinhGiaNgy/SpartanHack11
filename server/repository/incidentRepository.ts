import { prisma } from "@/lib/prisma";
import type { CreateIncidentRequest } from "@/server/types/incident";

export async function getIncidents(limit: number) {
  return prisma.crimeIncident.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: limit,
  });
}

export async function createIncident(data: CreateIncidentRequest) {
  return prisma.crimeIncident.create({
    data: {
      source: "user_report",
      sourceIncidentId: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      description: data.details || "No details provided",
      offenseCode: data.name || "User Report",
      location: `${data.location.lat}, ${data.location.lng}`,
      latitude: data.location.lat,
      longitude: data.location.lng,
      agency: "User Submitted",
      occurredAt: new Date(),
      raw: {
        user_submitted: true,
        type: data.type,
        image_data: data.image,
      },
    },
  });
}
