import { z } from "zod";

// DTO Types
export interface IncidentDto {
  id: string;
  name: string;
  type: "robbery" | "assault" | "harassment" | "other";
  details: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
}

// Request Schemas
export const GetIncidentsSchema = z.object({
  limit: z.number().min(1).max(500).default(100),
});

export const CreateIncidentSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["robbery", "assault", "harassment", "other"]).optional(),
  details: z.string().optional(),
  image: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export type GetIncidentsRequest = z.infer<typeof GetIncidentsSchema>;
export type CreateIncidentRequest = z.infer<typeof CreateIncidentSchema>;
