import { z } from "zod";
import type { CrimeIncident } from "@prisma/client";

// DTO Types
export interface CrimeIncidentDto {
  id: string;
  source: string;
  sourceIncidentId: string;
  incidentNum: string | null;
  caseNumber: string | null;
  offenseCode: string | null;
  description: string;
  location: string;
  locationName: string | null;
  address: string | null;
  crossStreet: string | null;
  agency: string;
  occurredAt: string | null;
  reportedAt: string | null;
  typeId: string | null;
  typeIconUrl: string | null;
  mapItId: string | null;
  disposition: string | null;
}

// Request/Query Schemas
export const GetCrimesSchema = z.object({
  since: z.string().optional(),
  limit: z.number().min(1).max(1000).default(250),
  source: z.string().optional(),
});

export type GetCrimesRequest = z.infer<typeof GetCrimesSchema>;
