import { agentService } from "@/server/services/agentService";
import { extractAgentOutput, toDto } from "@/server/mappers/agentMapper";
import { PostAgentSchema, type AgentResponseDto } from "@/server/types/agent";

export async function handlePostAgent(input: string): Promise<AgentResponseDto> {
  try {
    // Validate input using Zod
    const validated = PostAgentSchema.parse({ input });

    // Call service layer
    const result = await agentService.invokeAgent(validated.input);

    // Map to output
    const output = extractAgentOutput(result);
    const dto = toDto(output);

    return dto;
  } catch (error) {
    console.error("Error invoking agent:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return { error: "Invalid input: " + (error as any).errors[0].message };
    }
    return { error: "Failed to invoke agent" };
  }
}
