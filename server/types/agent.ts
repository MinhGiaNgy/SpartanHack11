import { z } from "zod";

// DTO Types
export interface AgentResponseDto {
  output?: string;
  error?: string;
}

// Request Schemas
export const PostAgentSchema = z.object({
  input: z.string().min(1, "Input cannot be empty"),
});

export type PostAgentRequest = z.infer<typeof PostAgentSchema>;
