import { agentService } from "@/server/services/agentService";
import { extractAgentOutput, toAgentResponseDto } from "@/server/mappers/agentMapper";

export interface AgentResponse {
  output?: string;
  error?: string;
}

export async function handlePostAgent(input: string): Promise<AgentResponse> {
  try {
    if (!input) {
      return { error: "Missing 'input' in request body." };
    }

    // Call service layer
    const result = await agentService.invokeAgent(input);

    // Map to output
    const output = extractAgentOutput(result);
    const dto = toAgentResponseDto(output);

    return dto;
  } catch (error) {
    console.error("Error invoking agent:", error);
    return { error: "Failed to invoke agent" };
  }
}
